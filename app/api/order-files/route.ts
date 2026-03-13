// This file: app/api/order-files/route.ts
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/order";
import { getSession } from "@/lib/auth";
import mongoose from "mongoose";

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
    const order_id = searchParams.get("order_id");

    if (!order_id) {
      return NextResponse.json(
        { success: false, message: "order_id is required." },
        { status: 400 },
      );
    }

    const query: any = { order_id };
    if (session.role !== "admin") {
      query.user_id = new mongoose.Types.ObjectId(session.userId);
    }

    const order = (await Order.findOne(query).lean()) as any;
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 },
      );
    }

    // Build files array with display names
    const files = (order.files || []).map((f: any, i: number) => {
      // Try to extract filename from Cloudinary URL
      const urlParts = (f.url || "").split("/");
      const rawName = urlParts[urlParts.length - 1] || `file-${i + 1}`;
      // Strip Cloudinary version prefix if present (e.g. "v1234567890_")
      const name = rawName.replace(/^v\d+_/, "").split("?")[0];
      return {
        name,
        url: f.url,
        type: f.resource_type || "image",
      };
    });

    // GCash receipt
    const gcash_receipt = order.gcash_receipt_url
      ? { url: order.gcash_receipt_url }
      : null;

    return NextResponse.json({
      success: true,
      data: { files, gcash_receipt },
    });
  } catch (err) {
    console.error("[ORDER-FILES GET ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error." },
      { status: 500 },
    );
  }
}
