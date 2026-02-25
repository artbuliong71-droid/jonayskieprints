import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { Order } from "@/models/order";

export async function GET() {
  try {
    await connectDB();

    const users = await User.find({ role: "customer" }).sort({ created_at: -1 });

    const customers = await Promise.all(
      users.map(async (u) => {
        const total_orders = await Order.countDocuments({ user_id: u._id });
        return {
          id:          u._id.toString(),
          first_name:  u.first_name,
          last_name:   u.last_name,
          email:       u.email,
          phone:       u.phone || "",
          role:        u.role,
          created_at:  u.created_at,
          total_orders,
        };
      })
    );

    return NextResponse.json({ success: true, data: customers });
  } catch (err) {
    console.error("[ADMIN CUSTOMERS ERROR]", err);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}