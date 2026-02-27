import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/order";
import { User } from "@/models/user";
import { getSession } from "@/lib/auth";
import { Pricing } from "@/models/pricing";
import { uploadToCloudinary } from "@/lib/upload";

// ── helpers ──────────────────────────────────────────────────────────────────

function generateOrderId(): string {
  return "ORD-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

const PAPER_MULTIPLIERS: Record<string, number> = {
  A4: 1.0,
  Short: 1.0,
  Long: 1.2,
};

async function getPricing() {
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
  if (addLamination && sl !== "laminating")
    total += prices.laminating * quantity;
  return total;
}

// ── Upload files to Cloudinary ────────────────────────────────────────────────
async function saveUploadedFiles(
  formData: FormData,
  fieldName: string,
): Promise<string[]> {
  const fileUrls: string[] = [];
  const files = formData.getAll(fieldName) as File[];

  if (!files || files.length === 0) return fileUrls;

  for (const file of files) {
    if (!file || file.size === 0) continue;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const url = await uploadToCloudinary(buffer, file.name);
    fileUrls.push(url);
  }

  return fileUrls;
}

// ── GET ───────────────────────────────────────────────────────────────────────

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

    // ── getUser ──
    if (action === "getUser") {
      const user = await User.findById(session.userId).select("-password");
      if (!user)
        return NextResponse.json(
          { success: false, message: "User not found." },
          { status: 404 },
        );
      return NextResponse.json({
        success: true,
        data: {
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
    }

    // ── getDashboardStats ──
    if (action === "getDashboardStats") {
      const userId = session.userId.toString();

      const [totalOrders, pendingOrders, completedOrders] = await Promise.all([
        Order.countDocuments({ user_id: userId }),
        Order.countDocuments({ user_id: userId, status: "pending" }),
        Order.countDocuments({ user_id: userId, status: "completed" }),
      ]);

      const completedOrderDocs = await Order.find({
        user_id: userId,
        status: "completed",
      }).select("total_amount");

      const totalSpent = completedOrderDocs.reduce(
        (sum, o) => sum + (parseFloat(o.total_amount) || 0),
        0,
      );

      return NextResponse.json({
        success: true,
        data: {
          totalOrders,
          pendingOrders,
          completedOrders,
          totalSpent: totalSpent.toFixed(2),
        },
      });
    }

    // ── getOrders ──
    if (action === "getOrders") {
      const status = searchParams.get("status");
      const query: any = { user_id: session.userId };
      if (status) query.status = status;
      const orders = await Order.find(query).sort({ created_at: -1 });
      return NextResponse.json({ success: true, data: { orders } });
    }

    // ── getOrder ──
    if (action === "getOrder") {
      const order_id = searchParams.get("order_id");
      const order = await Order.findOne({ order_id, user_id: session.userId });
      if (!order)
        return NextResponse.json(
          { success: false, message: "Order not found." },
          { status: 404 },
        );
      return NextResponse.json({ success: true, data: order });
    }

    return NextResponse.json(
      { success: false, message: "Unknown action." },
      { status: 400 },
    );
  } catch (err) {
    console.error("[DASHBOARD GET ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error." },
      { status: 500 },
    );
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

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
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const formData = await req.formData();

    // ── createOrder ──
    if (action === "createOrder") {
      const service = (formData.get("service") as string)?.trim();
      const quantity = parseInt(formData.get("quantity") as string) || 1;
      const specifications = (formData.get("specifications") as string)?.trim();
      const delivery_option = (
        formData.get("delivery_option") as string
      )?.trim();
      const delivery_address =
        (formData.get("delivery_address") as string)?.trim() || null;
      const paper_size = (formData.get("paper_size") as string) || "A4";
      const photo_size = (formData.get("photo_size") as string) || "A4";
      const color_option = (formData.get("color_option") as string) || "bw";
      const add_lamination = formData.get("add_lamination") === "on";

      if (!service || !specifications || !delivery_option) {
        return NextResponse.json(
          { success: false, message: "Missing required fields." },
          { status: 400 },
        );
      }

      const user = await User.findById(session.userId).select("-password");
      if (!user)
        return NextResponse.json(
          { success: false, message: "User not found." },
          { status: 404 },
        );

      // Upload files to Cloudinary
      const fileUrls = await saveUploadedFiles(formData, "files[]");

      // Build full specifications string
      const specsLines: string[] = [];
      if (["Print", "Photocopy", "Scanning"].includes(service))
        specsLines.push(`Paper Size: ${paper_size}`);
      if (service === "Print" || service === "Scanning")
        specsLines.push(
          `Print Type: ${color_option === "color" ? "Color" : "Black & White"}`,
        );
      if (service === "Photo Development")
        specsLines.push(`Photo Size: Glossy ${photo_size}`);
      if (add_lamination) specsLines.push("Add Lamination: Yes");
      if (specifications) specsLines.push(specifications);
      const fullSpecs = specsLines.join("\n");

      const prices = await getPricing();
      const total_amount = calcTotal(
        service,
        quantity,
        color_option,
        paper_size,
        add_lamination,
        prices,
      );
      const order_id = generateOrderId();

      const order = await Order.create({
        order_id,
        user_id: session.userId,
        user_name: `${user.first_name} ${user.last_name}`,
        user_email: user.email,
        service,
        quantity,
        specifications: fullSpecs,
        delivery_option,
        delivery_address,
        status: "pending",
        total_amount,
        payment_method: "cash",
        files: fileUrls,
      });

      return NextResponse.json({
        success: true,
        message: "Order placed successfully!",
        data: { order_id: order.order_id },
      });
    }

    // ── updateOrder ──
    if (action === "updateOrder") {
      const order_id = (formData.get("order_id") as string)?.trim();
      const service = (formData.get("service") as string)?.trim();
      const quantity = parseInt(formData.get("quantity") as string) || 1;
      const specifications = (formData.get("specifications") as string)?.trim();
      const delivery_option = (
        formData.get("delivery_option") as string
      )?.trim();
      const delivery_address =
        (formData.get("delivery_address") as string)?.trim() || null;
      const paper_size = (formData.get("paper_size") as string) || "A4";
      const photo_size = (formData.get("photo_size") as string) || "A4";
      const color_option = (formData.get("color_option") as string) || "bw";
      const add_lamination = formData.get("add_lamination") === "on";

      const order = await Order.findOne({ order_id, user_id: session.userId });
      if (!order)
        return NextResponse.json(
          { success: false, message: "Order not found." },
          { status: 404 },
        );
      if (order.status !== "pending")
        return NextResponse.json(
          { success: false, message: "Only pending orders can be edited." },
          { status: 400 },
        );

      // Upload new files to Cloudinary, or keep existing
      const newFileUrls = await saveUploadedFiles(formData, "new_files[]");
      const updatedFiles =
        newFileUrls.length > 0 ? newFileUrls : (order.files ?? []);

      const specsLines: string[] = [];
      if (["Print", "Photocopy", "Scanning"].includes(service))
        specsLines.push(`Paper Size: ${paper_size}`);
      if (service === "Print" || service === "Scanning")
        specsLines.push(
          `Print Type: ${color_option === "color" ? "Color" : "Black & White"}`,
        );
      if (service === "Photo Development")
        specsLines.push(`Photo Size: Glossy ${photo_size}`);
      if (add_lamination) specsLines.push("Add Lamination: Yes");
      if (specifications) specsLines.push(specifications);

      const prices = await getPricing();
      const total_amount = calcTotal(
        service,
        quantity,
        color_option,
        paper_size,
        add_lamination,
        prices,
      );

      order.service = service;
      order.quantity = quantity;
      order.specifications = specsLines.join("\n");
      order.delivery_option = delivery_option as "pickup" | "delivery";
      order.delivery_address = delivery_address;
      order.total_amount = total_amount;
      order.files = updatedFiles;
      await order.save();

      return NextResponse.json({
        success: true,
        message: "Order updated!",
        data: order,
      });
    }

    // ── update_profile ──
    const update_profile = formData.get("update_profile");
    if (update_profile === "1") {
      const first_name = (formData.get("first_name") as string)?.trim();
      const last_name = (formData.get("last_name") as string)?.trim();
      const email = (formData.get("email") as string)?.trim().toLowerCase();
      const phone = (formData.get("phone") as string)?.trim() || "";

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

      const current_password = formData.get("current_password") as string;
      const new_password = formData.get("new_password") as string;
      if (current_password && new_password) {
        const isMatch = await user.comparePassword(current_password);
        if (!isMatch)
          return NextResponse.json(
            { success: false, message: "Current password is incorrect." },
            { status: 400 },
          );
        user.password = new_password;
      }

      await user.save();
      return NextResponse.json({ success: true, message: "Profile updated!" });
    }

    return NextResponse.json(
      { success: false, message: "Unknown action." },
      { status: 400 },
    );
  } catch (err) {
    console.error("[DASHBOARD POST ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error." },
      { status: 500 },
    );
  }
}
