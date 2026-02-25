import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/order";
import { User } from "@/models/user";

export async function GET() {
  try {
    await connectDB();

    const [
      totalOrders,
      pendingOrders,
      inProgressOrders,
      completedOrders,
      cancelledOrders,
      totalCustomers,
      revenueResult,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: "pending" }),
      Order.countDocuments({ status: "in-progress" }),
      Order.countDocuments({ status: "completed" }),
      Order.countDocuments({ status: "cancelled" }),
      User.countDocuments({ role: "customer" }),
      Order.aggregate([
        { $match: { status: { $in: ["completed", "in-progress"] } } },
        { $group: { _id: null, total: { $sum: "$total_amount" } } },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        inProgressOrders,
        completedOrders,
        cancelledOrders,
        totalCustomers,
        totalRevenue: (revenueResult[0]?.total ?? 0).toFixed(2),
      },
    });
  } catch (err) {
    console.error("[ADMIN STATS ERROR]", err);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}