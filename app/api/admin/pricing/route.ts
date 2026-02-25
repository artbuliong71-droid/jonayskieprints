import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Pricing } from "@/models/pricing";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { print_bw, print_color, photocopying, scanning, photo_development, laminating } = body;

    const prices = [print_bw, print_color, photocopying, scanning, photo_development, laminating];
    if (prices.some((p) => isNaN(p) || p < 0)) {
      return NextResponse.json({ success: false, message: "Invalid pricing values." }, { status: 400 });
    }

    let pricing = await Pricing.findOne();
    if (!pricing) pricing = new Pricing({});

    pricing.print_bw          = print_bw;
    pricing.print_color       = print_color;
    pricing.photocopying      = photocopying;
    pricing.scanning          = scanning;
    pricing.photo_development = photo_development;
    pricing.laminating        = laminating;
    pricing.updated_at        = new Date();

    await pricing.save();

    return NextResponse.json({ success: true, message: "Pricing updated successfully!" });
  } catch (err) {
    console.error("[ADMIN PRICING ERROR]", err);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}