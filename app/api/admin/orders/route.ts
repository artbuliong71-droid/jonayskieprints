// app/api/admin/orders/route.ts

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/order";
import { DeletedOrder } from "@/models/delete-order";
import mongoose from "mongoose";

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

async function enrichOrders(orders: any[]) {
  const missingIds = orders
    .filter((o) => !o.user_name && o.user_id)
    .map((o) => o.user_id);
  let userMap: Record<string, any> = {};

  if (missingIds.length > 0) {
    const users = await UserModel.find(
      { _id: { $in: missingIds } },
      "first_name last_name email",
    ).lean();
    for (const u of users) userMap[u._id.toString()] = u;
  }

  return orders.map((o) => {
    const plain = typeof o.toObject === "function" ? o.toObject() : { ...o };

    if (!plain.user_name && plain.user_id) {
      const u = userMap[plain.user_id.toString()];
      if (u) {
        plain.user_name = `${u.first_name} ${u.last_name}`.trim();
        plain.user_email = u.email || plain.user_email || "";
      }
    }

    plain.files = (plain.files || []).map((f: any) =>
      typeof f === "string"
        ? { url: f, resource_type: "image" }
        : { url: f.url, resource_type: f.resource_type || "image" },
    );

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

    const rawOrders = await Order.find(query).sort({ created_at: -1 }).lean();
    const orders = await enrichOrders(rawOrders);

    return NextResponse.json({ success: true, data: orders });
  } catch (err) {
    console.error("[ADMIN ORDERS GET ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error." },
      { status: 500 },
    );
  }
}

// PATCH — update order status + send email notification
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const formData = await req.formData();
    const order_id = formData.get("order_id") as string;
    const status = formData.get("status") as string;

    if (!order_id)
      return NextResponse.json(
        { success: false, message: "Order ID is required." },
        { status: 400 },
      );

    const validStatuses = ["pending", "in-progress", "completed", "cancelled"];
    if (!validStatuses.includes(status))
      return NextResponse.json(
        { success: false, message: "Invalid status." },
        { status: 400 },
      );

    const orConditions: any[] = [{ order_id }];
    if (mongoose.isValidObjectId(order_id))
      orConditions.push({ _id: new mongoose.Types.ObjectId(order_id) });

    const order = (await Order.findOneAndUpdate(
      { $or: orConditions },
      { status, updated_at: new Date() },
      { returnDocument: "after" },
    )) as any;

    if (!order) {
      console.error("[PATCH] Order not found for id:", order_id);
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 },
      );
    }

    // ── Send email notification to customer ──────────────────────────────────
    if (status === "in-progress" || status === "completed") {
      try {
        // Fallback: get email from User if order.user_email is missing
        let recipientEmail = order.user_email;
        if (!recipientEmail && order.user_id) {
          const user = (await UserModel.findById(order.user_id).lean()) as any;
          recipientEmail = user?.email;
        }

        console.log("[EMAIL DEBUG] Sending to:", recipientEmail);
        console.log("[EMAIL DEBUG] GMAIL_USER:", process.env.GMAIL_USER);
        console.log(
          "[EMAIL DEBUG] GMAIL_PASS exists:",
          !!process.env.GMAIL_PASS,
        );

        if (!recipientEmail) {
          console.error("[EMAIL DEBUG] No recipient email found, skipping.");
        } else {
          const nodemailer = await import("nodemailer");
          const transporter = nodemailer.default.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
              user: process.env.GMAIL_USER,
              pass: process.env.GMAIL_PASS,
            },
          });

          const isCompleted = status === "completed";
          const statusLabel = isCompleted ? "Completed ✓" : "In Progress";
          const statusColor = isCompleted ? "#2d9b5a" : "#d97706";
          const statusMessage = isCompleted
            ? "Your order has been completed and is ready for pickup or delivery."
            : "Your order is now being processed by our team.";

          await transporter.sendMail({
            from: `"Jonayskie Prints" <${process.env.GMAIL_USER}>`,
            to: recipientEmail,
            subject: `Order ${order.order_id} — ${statusLabel} | Jonayskie Prints`,
            html: `
              <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #7c3aed; margin-bottom: 4px;">Jonayskie Prints</h2>
                <p style="color: #9ca3af; font-size: 13px; margin-bottom: 24px;">Order Status Update</p>

                <div style="background: ${statusColor}18; border-left: 4px solid ${statusColor}; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                  <p style="margin: 0; font-weight: 700; color: ${statusColor}; font-size: 1rem;">${statusLabel}</p>
                  <p style="margin: 6px 0 0; color: #4b5563; font-size: 0.875rem;">${statusMessage}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                  <tr>
                    <td style="padding: 8px 0; color: #9ca3af; width: 40%;">Order ID</td>
                    <td style="padding: 8px 0; color: #0f0e11; font-weight: 600;">${order.order_id}</td>
                  </tr>
                  <tr style="border-top: 1px solid #f3f4f6;">
                    <td style="padding: 8px 0; color: #9ca3af;">Service</td>
                    <td style="padding: 8px 0; color: #0f0e11; font-weight: 600;">${order.service}</td>
                  </tr>
                  <tr style="border-top: 1px solid #f3f4f6;">
                    <td style="padding: 8px 0; color: #9ca3af;">Quantity</td>
                    <td style="padding: 8px 0; color: #0f0e11; font-weight: 600;">${order.quantity}</td>
                  </tr>
                  <tr style="border-top: 1px solid #f3f4f6;">
                    <td style="padding: 8px 0; color: #9ca3af;">Total Amount</td>
                    <td style="padding: 8px 0; color: #0f0e11; font-weight: 600;">₱${Number(order.total_amount).toFixed(2)}</td>
                  </tr>
                  <tr style="border-top: 1px solid #f3f4f6;">
                    <td style="padding: 8px 0; color: #9ca3af;">Delivery</td>
                    <td style="padding: 8px 0; color: #0f0e11; font-weight: 600; text-transform: capitalize;">${order.delivery_option}</td>
                  </tr>
                </table>

                ${
                  isCompleted
                    ? `
                <div style="margin-top: 24px; background: #f5f3ff; border-radius: 10px; padding: 16px; text-align: center;">
                  <p style="margin: 0; color: #7c3aed; font-weight: 600;">Thank you for choosing Jonayskie Prints!</p>
                  <p style="margin: 6px 0 0; color: #6b7280; font-size: 0.82rem;">We hope to serve you again soon.</p>
                </div>
                `
                    : `
                <div style="margin-top: 24px; background: #fffbeb; border-radius: 10px; padding: 16px; text-align: center;">
                  <p style="margin: 0; color: #d97706; font-weight: 600;">We'll notify you again once your order is completed.</p>
                </div>
                `
                }

                <p style="margin-top: 24px; color: #9ca3af; font-size: 12px; text-align: center;">
                  Questions? Contact us at jonalynpascual2704@gmail.com or +63 935 033 6938
                </p>
              </div>
            `,
          });

          console.log(
            "[EMAIL DEBUG] Email sent successfully to:",
            recipientEmail,
          );
        }
      } catch (emailErr) {
        console.error("[STATUS EMAIL ERROR]", emailErr);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Order status updated.",
      data: order,
    });
  } catch (err) {
    console.error("[ADMIN ORDERS PATCH ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error." },
      { status: 500 },
    );
  }
}

// DELETE — archive to DeletedOrder, then remove from Orders
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const order_id = searchParams.get("order_id");

    if (!order_id)
      return NextResponse.json(
        { success: false, message: "Order ID required." },
        { status: 400 },
      );

    const orConditions: any[] = [{ order_id }];
    if (mongoose.isValidObjectId(order_id))
      orConditions.push({ _id: new mongoose.Types.ObjectId(order_id) });

    const order = await Order.findOne({ $or: orConditions });
    if (!order)
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 },
      );

    let user_name = order.user_name || "";
    let user_email = order.user_email || "";
    if (!user_name && order.user_id) {
      try {
        const u = (await UserModel.findById(order.user_id).lean()) as any;
        if (u) {
          user_name = `${u.first_name} ${u.last_name}`.trim();
          user_email = u.email || "";
        }
      } catch {}
    }

    await DeletedOrder.create({
      original_id: order._id.toString(),
      order_id: order.order_id || order._id.toString(),
      user_name,
      user_email,
      service: order.service || "",
      quantity: order.quantity || 1,
      status: order.status || "cancelled",
      total_amount: order.total_amount || 0,
      delivery_option: order.delivery_option || "",
      pickup_time: order.pickup_time || null,
      specifications: order.specifications || "",
      files: (order.files || []).map((f: any) => ({
        url: f.url,
        resource_type: f.resource_type || "image",
      })),
      created_at: order.created_at || new Date(),
      deleted_at: new Date(),
    });

    await Order.findOneAndDelete({ $or: orConditions });

    return NextResponse.json({
      success: true,
      message: "Order deleted and archived.",
    });
  } catch (err) {
    console.error("[ADMIN ORDERS DELETE ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error." },
      { status: 500 },
    );
  }
}
