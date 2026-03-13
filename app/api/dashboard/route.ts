export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/order";
import { Pricing } from "@/models/pricing";
import { getSession } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/upload";
import mongoose from "mongoose";

const PAPER_MULTIPLIERS: Record<string, number> = {
  A4: 1.0,
  Short: 1.0,
  Long: 1.2,
};

async function getPrices() {
  let pricing = await Pricing.findOne();
  if (!pricing) pricing = await Pricing.create({});
  return pricing;
}

function calcTotal(
  service: string,
  quantity: number,
  colorOption: string,
  paperSize: string,
  addLamination: boolean,
  prices: any,
): number {
  const sl = service.toLowerCase();
  const multiplier = PAPER_MULTIPLIERS[paperSize] ?? 1.0;
  let price = 0;
  if (sl === "print") {
    price =
      (colorOption === "color" ? prices.print_color : prices.print_bw) *
      multiplier;
  } else if (sl === "photocopy") {
    price = prices.photocopying * multiplier;
  } else if (sl === "scanning") {
    price = prices.scanning * multiplier;
  } else if (sl === "photo development") {
    price = prices.photo_development;
  } else if (sl === "laminating") {
    price = prices.laminating;
  }
  let total = price * quantity;
  if (addLamination && sl !== "laminating") {
    total += prices.laminating * quantity;
  }
  return total;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated." },
        { status: 401 },
      );
    }
    await connectDB();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const status = searchParams.get("status");
    const order_id = searchParams.get("order_id");

    if (action === "getOrder" && order_id) {
      const order = await Order.findOne({
        order_id,
        ...(session.role !== "admin" ? { user_id: session.userId } : {}),
      });
      if (!order)
        return NextResponse.json(
          { success: false, message: "Order not found." },
          { status: 404 },
        );
      return NextResponse.json({ success: true, data: formatOrder(order) });
    }

    if (action === "getDashboardStats") {
      const query =
        session.role === "admin"
          ? {}
          : { user_id: new mongoose.Types.ObjectId(session.userId) };
      const [totalOrders, pendingOrders, completedOrders, totalSpentAgg] =
        await Promise.all([
          Order.countDocuments(query),
          Order.countDocuments({ ...query, status: "pending" }),
          Order.countDocuments({ ...query, status: "completed" }),
          Order.aggregate([
            { $match: { ...query, status: "completed" } },
            { $group: { _id: null, total: { $sum: "$total_amount" } } },
          ]),
        ]);
      return NextResponse.json({
        success: true,
        data: {
          totalOrders,
          pendingOrders,
          completedOrders,
          totalSpent: (totalSpentAgg[0]?.total || 0).toFixed(2),
        },
      });
    }

    if (action === "getUser") {
      const { User } = await import("@/models/user");
      const user = await User.findById(session.userId).lean();
      if (!user)
        return NextResponse.json(
          { success: false, message: "User not found." },
          { status: 404 },
        );
      return NextResponse.json({
        success: true,
        data: {
          first_name: (user as any).first_name,
          last_name: (user as any).last_name,
          email: (user as any).email,
          phone: (user as any).phone || "",
          role: (user as any).role,
        },
      });
    }

    const query: any =
      session.role === "admin"
        ? {}
        : { user_id: new mongoose.Types.ObjectId(session.userId) };
    if (status) query.status = status;
    const orders = await Order.find(query).sort({ created_at: -1 });
    return NextResponse.json({
      success: true,
      data: { orders: orders.map(formatOrder) },
    });
  } catch (err) {
    console.error("[DASHBOARD GET ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated." },
        { status: 401 },
      );
    }
    await connectDB();
    const urlAction = new URL(req.url).searchParams.get("action") || "";
    const formData = await req.formData();
    const action = (formData.get("action") as string) || urlAction;

    if (action === "cancelOrder") {
      const order_id = formData.get("order_id") as string;
      if (!order_id)
        return NextResponse.json(
          { success: false, message: "Order ID is required." },
          { status: 400 },
        );
      const filterQuery: any = { order_id, status: "pending" };
      if (session.role !== "admin")
        filterQuery.user_id = new mongoose.Types.ObjectId(session.userId);
      const order = await Order.findOneAndUpdate(
        filterQuery,
        { status: "cancelled", updated_at: new Date() },
        { new: true },
      );
      if (!order)
        return NextResponse.json(
          {
            success: false,
            message:
              "Order not found or cannot be cancelled. Only pending orders can be cancelled.",
          },
          { status: 404 },
        );
      return NextResponse.json({
        success: true,
        message: "Order cancelled successfully.",
        data: formatOrder(order),
      });
    }

    if (action === "updateStatus") {
      if (session.role !== "admin")
        return NextResponse.json(
          { success: false, message: "Unauthorized." },
          { status: 403 },
        );
      const order_id = formData.get("order_id") as string;
      const newStatus = formData.get("status") as string;
      const adminAllowedStatuses = ["pending", "in-progress", "completed"];
      if (!adminAllowedStatuses.includes(newStatus)) {
        return NextResponse.json(
          {
            success: false,
            message: "Admins can only set: pending, in-progress, or completed.",
          },
          { status: 400 },
        );
      }
      const order = await Order.findOneAndUpdate(
        { order_id },
        { status: newStatus, updated_at: new Date() },
        { new: true },
      );
      if (!order)
        return NextResponse.json(
          { success: false, message: "Order not found." },
          { status: 404 },
        );
      return NextResponse.json({
        success: true,
        message: "Order status updated.",
        data: formatOrder(order),
      });
    }

    if (action === "updateOrder") {
      const order_id = formData.get("order_id") as string;
      const order = await Order.findOne({
        order_id,
        user_id: session.userId,
        status: "pending",
      });
      if (!order)
        return NextResponse.json(
          { success: false, message: "Order not found or cannot be edited." },
          { status: 404 },
        );
      const service = formData.get("service") as string;
      const quantity = parseInt(formData.get("quantity") as string) || 1;
      const specifications = buildSpecifications(formData);
      const delivery_option = formData.get("delivery_option") as string;
      const delivery_address =
        delivery_option === "delivery"
          ? (formData.get("delivery_address") as string)
          : null;
      const pickup_time =
        delivery_option === "pickup"
          ? (formData.get("pickup_time") as string) || null
          : null;
      const prices = await getPrices();
      const colorOption = (formData.get("color_option") as string) || "bw";
      const paperSize = (formData.get("paper_size") as string) || "A4";
      const addLamination = formData.get("add_lamination") === "on";
      const total_amount = calcTotal(
        service,
        quantity,
        colorOption,
        paperSize,
        addLamination,
        prices,
      );
      order.service = service;
      order.quantity = quantity;
      order.specifications = specifications;
      order.delivery_option = delivery_option as "pickup" | "delivery";
      order.delivery_address = delivery_address;
      order.pickup_time = pickup_time;
      order.total_amount = total_amount;
      order.updated_at = new Date();
      await order.save();
      return NextResponse.json({
        success: true,
        message: "Order updated successfully.",
        data: formatOrder(order),
      });
    }

    if (formData.get("update_profile") === "1") {
      const { User } = await import("@/models/user");
      const first_name = formData.get("first_name") as string;
      const last_name = formData.get("last_name") as string;
      const email = formData.get("email") as string;
      const phone = formData.get("phone") as string;
      const new_password = formData.get("new_password") as string;
      const current_password = formData.get("current_password") as string;
      const user = await User.findById(session.userId);
      if (!user)
        return NextResponse.json(
          { success: false, message: "User not found." },
          { status: 404 },
        );
      user.first_name = first_name;
      user.last_name = last_name;
      user.email = email;
      user.phone = phone;
      if (new_password) {
        const bcrypt = await import("bcryptjs");
        const isMatch = await bcrypt.default.compare(
          current_password,
          user.password,
        );
        if (!isMatch)
          return NextResponse.json(
            { success: false, message: "Current password is incorrect." },
            { status: 400 },
          );
        user.password = await bcrypt.default.hash(new_password, 12);
      }
      await user.save();
      return NextResponse.json({ success: true, message: "Profile updated." });
    }

    // ── CREATE NEW ORDER ──────────────────────────────────────────────────────
    const service = formData.get("service") as string;
    const quantity = parseInt(formData.get("quantity") as string) || 1;
    const delivery_option =
      (formData.get("delivery_option") as string) || "pickup";
    const delivery_address =
      delivery_option === "delivery"
        ? (formData.get("delivery_address") as string)
        : null;
    const pickup_time =
      delivery_option === "pickup"
        ? (formData.get("pickup_time") as string) || null
        : null;
    const specifications = buildSpecifications(formData);

    if (!service || !specifications) {
      return NextResponse.json(
        { success: false, message: "Service and specifications are required." },
        { status: 400 },
      );
    }

    const prices = await getPrices();
    const colorOption = (formData.get("color_option") as string) || "bw";
    const paperSize = (formData.get("paper_size") as string) || "A4";
    const addLamination = formData.get("add_lamination") === "on";
    const total_amount = calcTotal(
      service,
      quantity,
      colorOption,
      paperSize,
      addLamination,
      prices,
    );

    // ── Read payment method and GCash fields ──────────────────────────────────
    const payment_method = (formData.get("payment_method") as string) || "Cash";
    const gcash_ref_num = (formData.get("gcash_ref_num") as string) || null;

    // ── Upload order files to Cloudinary ─────────────────────────────────────
    const uploadedFiles: {
      url: string;
      resource_type: string;
      name: string;
    }[] = [];
    const fileEntries = formData.getAll("files") as File[];
    for (const file of fileEntries) {
      if (!file || typeof file === "string" || file.size === 0) continue;
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadToCloudinary(buffer, file.name);
        uploadedFiles.push({
          url: result.url,
          resource_type: result.resource_type,
          name: file.name,
        });
        console.log(`[UPLOAD SUCCESS] ${file.name} → ${result.url}`);
      } catch (uploadErr) {
        console.error("[FILE UPLOAD ERROR]", file.name, uploadErr);
      }
    }

    // ── Upload GCash receipt to Cloudinary ────────────────────────────────────
    let gcash_receipt_url: string | null = null;
    const gcashReceiptFile = formData.get("gcash_receipt") as File | null;
    if (
      gcashReceiptFile &&
      typeof gcashReceiptFile !== "string" &&
      gcashReceiptFile.size > 0
    ) {
      try {
        const buffer = Buffer.from(await gcashReceiptFile.arrayBuffer());
        const result = await uploadToCloudinary(buffer, gcashReceiptFile.name);
        gcash_receipt_url = result.url;
        console.log(`[GCASH RECEIPT UPLOAD] → ${result.url}`);
      } catch (uploadErr) {
        console.error("[GCASH RECEIPT UPLOAD ERROR]", uploadErr);
      }
    }

    // ── Save order ────────────────────────────────────────────────────────────
    const order = await Order.create({
      user_id: new mongoose.Types.ObjectId(session.userId),
      service,
      quantity,
      specifications,
      delivery_option,
      delivery_address,
      pickup_time,
      total_amount,
      payment_method,
      gcash_ref_num,
      gcash_receipt_url,
      files: uploadedFiles,
    });

    return NextResponse.json({
      success: true,
      message: "Order placed successfully!",
      data: {
        order_id: order.order_id || order._id.toString(),
        total_amount: order.total_amount,
        files: order.files,
      },
    });
  } catch (err) {
    console.error("[DASHBOARD POST ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error." },
      { status: 500 },
    );
  }
}

function buildSpecifications(formData: FormData): string {
  const parts: string[] = [];
  const paperSize = formData.get("paper_size") as string;
  const colorOption = formData.get("color_option") as string;
  const photoSize = formData.get("photo_size") as string;
  const addLamination = formData.get("add_lamination") === "on";
  const service = (formData.get("service") as string)?.toLowerCase();
  const userSpecs = (formData.get("specifications") as string)?.trim();
  const copies = formData.get("copies") as string;
  const pickupTime = formData.get("pickup_time") as string;
  if (paperSize && ["print", "photocopy", "scanning"].includes(service))
    parts.push(`Paper Size: ${paperSize}`);
  if (colorOption === "color" && service === "print")
    parts.push("Print Type: Color");
  else if (colorOption === "bw" && service === "print")
    parts.push("Print Type: Black & White");
  if (colorOption && service === "scanning")
    parts.push(
      `Scan Type: ${colorOption === "color" ? "Color" : "Black & White"}`,
    );
  if (service === "photocopy") parts.push("Copy Type: Standard");
  if (photoSize && service === "photo development")
    parts.push(`Photo Size: Glossy ${photoSize}`);
  if (addLamination) parts.push("Add Lamination: Yes");
  if (copies && ["print", "photocopy"].includes(service))
    parts.push(`Copies: ${copies}`);
  if (pickupTime) parts.push(`Pickup Time: ${pickupTime}`);
  if (userSpecs) parts.push(userSpecs);
  return parts.join("\n");
}

function formatOrder(order: any) {
  return {
    order_id: order.order_id || order._id.toString(),
    service: order.service,
    quantity: order.quantity,
    specifications: order.specifications,
    delivery_option: order.delivery_option,
    delivery_address: order.delivery_address,
    pickup_time: order.pickup_time || null,
    status: order.status,
    payment_method: order.payment_method,
    gcash_ref_num: order.gcash_ref_num || null,
    gcash_receipt_url: order.gcash_receipt_url || null,
    total_amount: Number(order.total_amount).toFixed(2),
    created_at: order.created_at,
    updated_at: order.updated_at,
    user_id: order.user_id?.toString(),
    files: (order.files || []).map((f: any) => ({
      url: f.url,
      resource_type: f.resource_type || "image",
    })),
  };
}
