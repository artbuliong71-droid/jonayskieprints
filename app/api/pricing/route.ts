import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/order";
import { Pricing } from "@/models/pricing";
import { getSession } from "@/lib/auth";
import mongoose from "mongoose";

// ── Pricing helpers ──────────────────────────────────────────────────────────

const PAPER_MULTIPLIERS: Record<string, number> = { A4: 1.0, Short: 1.0, Long: 1.2 };

async function getPrices() {
  let pricing = await Pricing.findOne();
  if (!pricing) {
    pricing = await Pricing.create({});
  }
  return pricing;
}

function calcTotal(
  service: string,
  quantity: number,
  colorOption: string,
  paperSize: string,
  addLamination: boolean,
  prices: any
): number {
  const sl = service.toLowerCase();
  const multiplier = PAPER_MULTIPLIERS[paperSize] ?? 1.0;
  let price = 0;

  if (sl === "print") {
    price = (colorOption === "color" ? prices.print_color : prices.print_bw) * multiplier;
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

// ── GET — fetch orders ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const action   = searchParams.get("action");
    const status   = searchParams.get("status");
    const order_id = searchParams.get("order_id");

    // Get single order
    if (action === "getOrder" && order_id) {
      const order = await Order.findOne({
        _id: order_id,
        ...(session.role !== "admin" ? { user_id: session.userId } : {}),
      });
      if (!order) {
        return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: formatOrder(order) });
    }

    // Get dashboard stats
    if (action === "getDashboardStats") {
      const query = session.role === "admin" ? {} : { user_id: new mongoose.Types.ObjectId(session.userId) };
      const [totalOrders, pendingOrders, completedOrders, totalSpentAgg] = await Promise.all([
        Order.countDocuments(query),
        Order.countDocuments({ ...query, status: "pending" }),
        Order.countDocuments({ ...query, status: "completed" }),
        Order.aggregate([
          { $match: query },
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

    // Get all orders (with optional status filter)
    const query: any = session.role === "admin"
      ? {}
      : { user_id: new mongoose.Types.ObjectId(session.userId) };

    if (status) query.status = status;

    const orders = await Order.find(query).sort({ created_at: -1 });
    return NextResponse.json({
      success: true,
      data: { orders: orders.map(formatOrder) },
    });

  } catch (err) {
    console.error("[ORDERS GET ERROR]", err);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}

// ── POST — create or update order ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
    }

    await connectDB();

    const formData = await req.formData();
    const action   = formData.get("action") as string || new URL(req.url).searchParams.get("action") || "";

    // ── Update order status (admin only) ────────────────────────────────────
    if (action === "updateStatus") {
      if (session.role !== "admin") {
        return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 403 });
      }
      const order_id  = formData.get("order_id") as string;
      const newStatus = formData.get("status")   as string;

      const validStatuses = ["pending", "in-progress", "completed", "cancelled"];
      if (!validStatuses.includes(newStatus)) {
        return NextResponse.json({ success: false, message: "Invalid status." }, { status: 400 });
      }

      const order = await Order.findByIdAndUpdate(
        order_id,
        { status: newStatus, updated_at: new Date() },
        { new: true }
      );
      if (!order) {
        return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: "Order status updated.", data: formatOrder(order) });
    }

    // ── Update order (customer, pending orders only) ─────────────────────────
    if (action === "updateOrder") {
      const order_id = formData.get("order_id") as string;
      const order = await Order.findOne({ _id: order_id, user_id: session.userId, status: "pending" });
      if (!order) {
        return NextResponse.json({ success: false, message: "Order not found or cannot be edited." }, { status: 404 });
      }

      const service       = formData.get("service")        as string;
      const quantity      = parseInt(formData.get("quantity") as string) || 1;
      const specifications = buildSpecifications(formData);
      const delivery_option  = formData.get("delivery_option") as string;
      const delivery_address = delivery_option === "delivery" ? formData.get("delivery_address") as string : null;

      const prices       = await getPrices();
      const colorOption  = formData.get("color_option") as string || "bw";
      const paperSize    = formData.get("paper_size")   as string || "A4";
      const addLamination = formData.get("add_lamination") === "on";
      const total_amount = calcTotal(service, quantity, colorOption, paperSize, addLamination, prices);

      order.service          = service;
      order.quantity         = quantity;
      order.specifications   = specifications;
      order.delivery_option  = delivery_option as "pickup" | "delivery";
      order.delivery_address = delivery_address;
      order.total_amount     = total_amount;
      order.updated_at       = new Date();

      await order.save();
      return NextResponse.json({
        success: true,
        message: "Order updated successfully.",
        data: formatOrder(order),
      });
    }

    // ── Create new order ─────────────────────────────────────────────────────
    const service          = formData.get("service")         as string;
    const quantity         = parseInt(formData.get("quantity") as string) || 1;
    const delivery_option  = formData.get("delivery_option")  as string || "pickup";
    const delivery_address = delivery_option === "delivery" ? formData.get("delivery_address") as string : null;
    const specifications   = buildSpecifications(formData);

    if (!service || !specifications) {
      return NextResponse.json({ success: false, message: "Service and specifications are required." }, { status: 400 });
    }

    const prices        = await getPrices();
    const colorOption   = formData.get("color_option")   as string || "bw";
    const paperSize     = formData.get("paper_size")     as string || "A4";
    const addLamination = formData.get("add_lamination") === "on";
    const total_amount  = calcTotal(service, quantity, colorOption, paperSize, addLamination, prices);

    const order = await Order.create({
      user_id: new mongoose.Types.ObjectId(session.userId),
      service,
      quantity,
      specifications,
      delivery_option,
      delivery_address,
      total_amount,
      payment_method: "cash",
    });

    return NextResponse.json({
      success: true,
      message: "Order placed successfully!",
      data: { order_id: order._id, total_amount: order.total_amount },
    });

  } catch (err) {
    console.error("[ORDERS POST ERROR]", err);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildSpecifications(formData: FormData): string {
  const parts: string[] = [];
  const paperSize    = formData.get("paper_size")    as string;
  const colorOption  = formData.get("color_option")  as string;
  const photoSize    = formData.get("photo_size")    as string;
  const addLamination = formData.get("add_lamination") === "on";
  const service      = (formData.get("service") as string)?.toLowerCase();
  const userSpecs    = (formData.get("specifications") as string)?.trim();

  if (paperSize && ["print", "photocopy", "scanning"].includes(service)) {
    parts.push(`Paper Size: ${paperSize}`);
  }
  if (colorOption === "color" && service === "print") {
    parts.push("Print Type: Color");
  } else if (colorOption === "bw" && service === "print") {
    parts.push("Print Type: Black & White");
  }
  if (colorOption && service === "scanning") {
    parts.push(`Scan Type: ${colorOption === "color" ? "Color" : "Black & White"}`);
  }
  if (service === "photocopy") {
    parts.push("Copy Type: Standard");
  }
  if (photoSize && service === "photo development") {
    parts.push(`Photo Size: Glossy ${photoSize}`);
  }
  if (addLamination) {
    parts.push("Add Lamination: Yes");
  }
  if (userSpecs) {
    parts.push(userSpecs);
  }

  return parts.join("\n");
}

function formatOrder(order: any) {
  return {
    order_id:         order._id.toString(),
    service:          order.service,
    quantity:         order.quantity,
    specifications:   order.specifications,
    delivery_option:  order.delivery_option,
    delivery_address: order.delivery_address,
    status:           order.status,
    payment_method:   order.payment_method,
    total_amount:     order.total_amount.toFixed(2),
    created_at:       order.created_at,
    updated_at:       order.updated_at,
    user_id:          order.user_id?.toString(),
  };
}