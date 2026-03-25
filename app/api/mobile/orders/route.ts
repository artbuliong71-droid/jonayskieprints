export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/order";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import mongoose from "mongoose";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

let UserModel: any;
try {
  UserModel = mongoose.model("User");
} catch {
  const UserSchema = new mongoose.Schema(
    {
      first_name: String,
      last_name: String,
      email: String,
      phone: String,
      role: String,
    },
    { collection: "users" },
  );
  UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
}

export async function GET(req: NextRequest) {
  try {
    // 1. Verify Firebase token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 },
      );
    }
    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = await getAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid token." },
        { status: 401 },
      );
    }

    await connectDB();

    // 2. Find MongoDB user by Firebase email
    const user = (await UserModel.findOne({
      email: decoded.email,
    }).lean()) as any;
    if (!user) {
      return NextResponse.json({ success: false, data: [] });
    }

    // 3. Query orders by MongoDB user_id
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const query: any = { user_id: user._id };
    if (status) query.status = status;

    const orders = await Order.find(query).sort({ created_at: -1 });

    return NextResponse.json({
      success: true,
      data: orders.map(formatOrder),
    });
  } catch (err) {
    console.error("[MOBILE ORDERS ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error." },
      { status: 500 },
    );
  }
}

function formatOrder(order: any) {
  return {
    order_id: order.order_id || order._id.toString(),
    service: order.service,
    serviceType: order.service,
    quantity: order.quantity,
    specifications: order.specifications,
    deliveryOption: order.delivery_option,
    pickupTime: order.pickup_time || null,
    status: order.status,
    paymentMethod: order.payment_method,
    totalAmount: String(order.total_amount),
    price: Number(order.total_amount),
    createdAt: order.created_at,
    date: order.created_at,
    fileName: order.files?.[0]?.url || null,
  };
}
