// FILE: src/app/api/pricing/route.ts
// This handles BOTH reading (GET) and saving (POST) pricing for admin settings.

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Pricing } from "@/models/pricing";
import { getSession } from "@/lib/auth";

// ── GET — fetch current pricing (used by customer + admin dashboards) ────────
export async function GET() {
  try {
    await connectDB();
    let pricing = await Pricing.findOne();
    if (!pricing) pricing = await Pricing.create({});

    return NextResponse.json({
      print_bw: pricing.print_bw ?? 1,
      print_color: pricing.print_color ?? 2,
      photocopying: pricing.photocopying ?? 2,
      scanning: pricing.scanning ?? 5,
      photo_development: pricing.photo_development ?? 15,
      laminating: pricing.laminating ?? 20,
    });
  } catch (err) {
    console.error("[PRICING GET ERROR]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── POST — update pricing (admin only) ───────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 403 },
      );
    }

    await connectDB();

    // Support both JSON and FormData bodies
    let data: Record<string, number> = {};

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      data = body;
    } else {
      // FormData
      const formData = await req.formData();
      data = {
        print_bw: parseFloat(formData.get("print_bw") as string) || 0,
        print_color: parseFloat(formData.get("print_color") as string) || 0,
        photocopying: parseFloat(formData.get("photocopying") as string) || 0,
        scanning: parseFloat(formData.get("scanning") as string) || 0,
        photo_development:
          parseFloat(formData.get("photo_development") as string) || 0,
        laminating: parseFloat(formData.get("laminating") as string) || 0,
      };
    }

    // Validate — all values must be positive numbers
    const fields = [
      "print_bw",
      "print_color",
      "photocopying",
      "scanning",
      "photo_development",
      "laminating",
    ];
    for (const field of fields) {
      if (
        typeof data[field] !== "number" ||
        isNaN(data[field]) ||
        data[field] < 0
      ) {
        return NextResponse.json(
          { success: false, message: `Invalid value for ${field}.` },
          { status: 400 },
        );
      }
    }

    // Upsert — update existing or create new
    const updated = await Pricing.findOneAndUpdate(
      {},
      {
        print_bw: data.print_bw,
        print_color: data.print_color,
        photocopying: data.photocopying,
        scanning: data.scanning,
        photo_development: data.photo_development,
        laminating: data.laminating,
        updated_at: new Date(),
      },
      { upsert: true, new: true },
    );

    return NextResponse.json({
      success: true,
      message: "Pricing updated successfully.",
      data: {
        print_bw: updated.print_bw,
        print_color: updated.print_color,
        photocopying: updated.photocopying,
        scanning: updated.scanning,
        photo_development: updated.photo_development,
        laminating: updated.laminating,
      },
    });
  } catch (err) {
    console.error("[PRICING POST ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error." },
      { status: 500 },
    );
  }
}
