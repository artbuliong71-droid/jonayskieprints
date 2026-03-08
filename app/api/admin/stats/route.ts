export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/order";
import { User } from "@/models/user";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period"); // "daily" | "weekly" | "monthly"
    const dateParam = searchParams.get("date"); // "YYYY-MM-DD"

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

    const totalRevenue = (revenueResult[0]?.total ?? 0).toFixed(2);

    // Base stats (always returned)
    const baseData = {
      totalOrders,
      pendingOrders,
      inProgressOrders,
      completedOrders,
      cancelledOrders,
      totalCustomers,
      totalRevenue,
    };

    // If no period requested, return base stats only
    if (!period || !dateParam) {
      return NextResponse.json({ success: true, data: baseData });
    }

    // Build date range for the selected period
    const baseDate = new Date(dateParam);

    let startDate: Date;
    let endDate: Date;
    let slots: number;
    let labelFn: (i: number, start: Date) => string;
    let groupFormat: string;

    if (period === "daily") {
      // Full day: 0:00 - 23:59
      startDate = new Date(baseDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(baseDate);
      endDate.setHours(23, 59, 59, 999);
      slots = 24;
      labelFn = (i) => `${String(i).padStart(2, "0")}:00`;
      groupFormat = "%H"; // group by hour
    } else if (period === "weekly") {
      // Week containing the selected date (Sun-Sat)
      const day = baseDate.getDay();
      startDate = new Date(baseDate);
      startDate.setDate(baseDate.getDate() - day);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      slots = 7;
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      labelFn = (i) => days[i];
      groupFormat = "%w"; // group by day of week (0=Sun)
    } else {
      // Monthly: full month of selected date
      startDate = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        1,
        0,
        0,
        0,
        0,
      );
      endDate = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      slots = endDate.getDate();
      labelFn = (i) => `Day ${i + 1}`;
      groupFormat = "%d"; // group by day of month
    }

    // Aggregate orders and revenue within the date range, grouped by period slot
    const [orderAgg, revenueAgg, newCustomersCount] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            created_at: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: groupFormat, date: "$created_at" },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            created_at: { $gte: startDate, $lte: endDate },
            status: { $in: ["completed", "in-progress"] },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: groupFormat, date: "$created_at" },
            },
            total: { $sum: "$total_amount" },
          },
        },
      ]),
      User.countDocuments({
        role: "customer",
        created_at: { $gte: startDate, $lte: endDate },
      }),
    ]);

    // Build lookup maps: slot key -> value
    const orderMap: Record<string, number> = {};
    orderAgg.forEach((item: { _id: string; count: number }) => {
      orderMap[item._id] = item.count;
    });

    const revenueMap: Record<string, number> = {};
    revenueAgg.forEach((item: { _id: string; total: number }) => {
      revenueMap[item._id] = item.total;
    });

    // Build chart data array
    const chartData = Array.from({ length: slots }, (_, i) => {
      let key: string;
      if (period === "daily") {
        key = String(i).padStart(2, "0");
      } else if (period === "weekly") {
        key = String(i); // 0=Sun ... 6=Sat
      } else {
        key = String(i + 1).padStart(2, "0"); // "01" ... "31"
      }
      return {
        label: labelFn(i, startDate),
        Revenue: parseFloat((revenueMap[key] ?? 0).toFixed(2)),
        Orders: orderMap[key] ?? 0,
      };
    });

    // Period-specific summary (orders/revenue within the selected period)
    const periodOrders = chartData.reduce((s, d) => s + d.Orders, 0);
    const periodRevenue = chartData.reduce((s, d) => s + d.Revenue, 0);
    const periodCompletionRate =
      periodOrders > 0
        ? Math.round(
            (chartData.reduce((s, d) => s + d.Orders, 0) /
              Math.max(periodOrders, 1)) *
              100,
          )
        : 0;

    // Get completed orders count for the period for accurate completion rate
    const periodCompletedCount = await Order.countDocuments({
      created_at: { $gte: startDate, $lte: endDate },
      status: "completed",
    });
    const accurateCompletionRate =
      periodOrders > 0
        ? Math.round((periodCompletedCount / periodOrders) * 100)
        : 0;

    return NextResponse.json({
      success: true,
      data: baseData,
      reportData: {
        totalOrders: periodOrders,
        totalRevenue: periodRevenue.toFixed(2),
        newCustomers: newCustomersCount,
        completionRate: accurateCompletionRate,
      },
      chartData,
    });
  } catch (err) {
    console.error("[ADMIN STATS ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error." },
      { status: 500 },
    );
  }
}
