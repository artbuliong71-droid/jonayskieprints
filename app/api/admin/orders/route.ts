import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/order";
import { DeletedOrder } from "@/models/delete-order";
import mongoose from "mongoose";

// ─── Inline User model (avoids import issues if your User model path differs) ──
// If you already have a User model at @/models/user or @/models/pricing, 
// replace this with: import { User } from "@/models/user";
let UserModel: any;
try {
  UserModel = mongoose.model("User");
} catch {
  const UserSchema = new mongoose.Schema({
    first_name: String,
    last_name:  String,
    email:      String,
    phone:      String,
    role:       String,
  }, { collection: "users" });
  UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
}

// ─── Helper: attach user_name + user_email to orders that are missing them ───
async function enrichOrders(orders: any[]) {
  // Collect all unique user_ids that are missing a name
  const missingIds = orders
    .filter(o => !o.user_name && o.user_id)
    .map(o => o.user_id);

  if (missingIds.length === 0) return orders;

  // Fetch those users in one query
  const users = await UserModel.find(
    { _id: { $in: missingIds } },
    "first_name last_name email"
  ).lean();

  const userMap: Record<string, any> = {};
  for (const u of users) {
    userMap[u._id.toString()] = u;
  }

  // Merge user data into each order object
  return orders.map(o => {
    const plain = typeof o.toObject === "function" ? o.toObject() : { ...o };
    if (!plain.user_name && plain.user_id) {
      const u = userMap[plain.user_id.toString()];
      if (u) {
        plain.user_name  = `${u.first_name} ${u.last_name}`.trim();
        plain.user_email = u.email || plain.user_email || "";
      }
    }
    return plain;
  });
}

// GET — fetch all orders (optionally filtered by status)
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const query: any = {};
    if (status) query.status = status;

    const rawOrders = await Order.find(query).sort({ created_at: -1 });
    const orders = await enrichOrders(rawOrders);

    return NextResponse.json({ success: true, data: orders });
  } catch (err) {
    console.error("[ADMIN ORDERS GET ERROR]", err);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}

// PATCH — update order status
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const formData = await req.formData();
    const order_id = formData.get("order_id") as string;
    const status   = formData.get("status")   as string;

    if (!order_id) {
      return NextResponse.json({ success: false, message: "Order ID is required." }, { status: 400 });
    }

    const validStatuses = ["pending", "in-progress", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: "Invalid status." }, { status: 400 });
    }

    const orConditions: any[] = [{ order_id }];
    if (mongoose.isValidObjectId(order_id)) {
      orConditions.push({ _id: new mongoose.Types.ObjectId(order_id) });
    }

    const order = await Order.findOneAndUpdate(
      { $or: orConditions },
      { status, updated_at: new Date() },
      { new: true }
    );

    if (!order) {
      console.error("[PATCH] Order not found for id:", order_id);
      return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Order status updated.", data: order });
  } catch (err) {
    console.error("[ADMIN ORDERS PATCH ERROR]", err);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}

// DELETE — save to DeletedOrder first, then delete
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const order_id = searchParams.get("order_id");

    if (!order_id) {
      return NextResponse.json({ success: false, message: "Order ID required." }, { status: 400 });
    }

    const orConditions: any[] = [{ order_id }];
    if (mongoose.isValidObjectId(order_id)) {
      orConditions.push({ _id: new mongoose.Types.ObjectId(order_id) });
    }

    const order = await Order.findOne({ $or: orConditions });
    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    }

    // If user_name is missing, enrich before archiving
    let user_name  = order.user_name  || "";
    let user_email = order.user_email || "";
    if (!user_name && order.user_id) {
      try {
        const u = await UserModel.findById(order.user_id).lean() as any;
        if (u) {
          user_name  = `${u.first_name} ${u.last_name}`.trim();
          user_email = u.email || "";
        }
      } catch {}
    }

    await DeletedOrder.create({
      original_id:     order._id.toString(),
      order_id:        order.order_id || order._id.toString(),
      user_name,
      user_email,
      service:         order.service || "",
      quantity:        order.quantity || 1,
      status:          order.status || "cancelled",
      total_amount:    order.total_amount || 0,
      delivery_option: order.delivery_option || "",
      specifications:  order.specifications || "",
      created_at:      order.created_at || new Date(),
      deleted_at:      new Date(),
    });

    await Order.findOneAndDelete({ $or: orConditions });

    return NextResponse.json({ success: true, message: "Order deleted and archived." });
  } catch (err) {
    console.error("[ADMIN ORDERS DELETE ERROR]", err);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}