export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/order";
import { getSession } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

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
    const orderId = formData.get("order_id") as string;
    const fileName = formData.get("file_name") as string;

    if (!orderId || !fileName) {
      return NextResponse.json(
        { success: false, message: "Missing fields." },
        { status: 400 },
      );
    }

    // Find the order and verify ownership
    const order = await Order.findOne({
      order_id: orderId,
      user_id: session.userId,
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 },
      );
    }

    // Find the file in the order's files array
    const fileIndex = order.files.findIndex(
      (f: any) => f.name === fileName || f.url?.includes(fileName),
    );

    if (fileIndex === -1) {
      return NextResponse.json({ success: true }); // already gone
    }

    const fileUrl = order.files[fileIndex].url;

    // Extract Cloudinary public_id from the URL
    // URL format: https://res.cloudinary.com/{cloud}/image/upload/v123/{public_id}.ext
    try {
      const urlParts = fileUrl.split("/upload/");
      if (urlParts.length === 2) {
        const withVersion = urlParts[1]; // e.g. "v1234567/folder/filename.pdf"
        const withoutVersion = withVersion.replace(/^v\d+\//, ""); // "folder/filename.pdf"
        const publicId = withoutVersion.replace(/\.[^/.]+$/, ""); // remove extension
        await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
        // Also try image type in case it's an image
        await cloudinary.uploader
          .destroy(publicId, { resource_type: "image" })
          .catch(() => {});
      }
    } catch {
      // Non-fatal — still remove from DB
    }

    // Remove from order's files array
    order.files.splice(fileIndex, 1);
    await order.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE FILE ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error." },
      { status: 500 },
    );
  }
}
