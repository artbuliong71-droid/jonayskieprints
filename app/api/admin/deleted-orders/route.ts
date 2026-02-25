import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DeletedOrder } from "@/models/delete-order";

// GET — fetch all deleted orders
export async function GET() {
  try {
    await connectDB();
    const deletedOrders = await DeletedOrder.find().sort({ deleted_at: -1 });
    return NextResponse.json({ success: true, data: deletedOrders });
  } catch (err) {
    console.error("[DELETED ORDERS GET ERROR]", err);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}