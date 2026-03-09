export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/order";
import { uploadToCloudinary } from "@/lib/upload"; // ✅ your existing lib
import { getSession } from "@/lib/auth";

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

    const formData = await req.formData();
    const order_id = formData.get("order_id") as string;

    // Support both single "file" and multiple "files[]"
    const fileEntries = formData.getAll("files") as File[];
    const singleFile = formData.get("file") as File | null;
    const files: File[] =
      fileEntries.length > 0 ? fileEntries : singleFile ? [singleFile] : [];

    if (!order_id) {
      return NextResponse.json(
        { success: false, message: "order_id is required." },
        { status: 400 },
      );
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, message: "No files provided." },
        { status: 400 },
      );
    }

    // Find order — customers can only upload to their own orders
    const orderQuery: any = { order_id };
    if (session.role !== "admin") {
      orderQuery.user_id = session.userId;
    }

    const order = await Order.findOne(orderQuery);
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 },
      );
    }

    // Upload all files to Cloudinary in parallel
    const uploaded = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return uploadToCloudinary(buffer, file.name);
      }),
    );

    // ✅ Push Cloudinary results into order.files and save to MongoDB
    order.files.push(...uploaded);
    await order.save();

    return NextResponse.json({
      success: true,
      message: `${uploaded.length} file(s) uploaded successfully.`,
      data: order.files,
    });
  } catch (err) {
    console.error("[UPLOAD ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
