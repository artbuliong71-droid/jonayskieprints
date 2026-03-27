import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Otp } from "@/models/otp";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, otp } = await req.json();

    if (!email || !otp)
      return NextResponse.json(
        { success: false, message: "Email and OTP are required." },
        { status: 400 },
      );

    const record = await Otp.findOne({ email: email.toLowerCase() });

    if (!record)
      return NextResponse.json(
        { success: false, message: "OTP not found. Please try again." },
        { status: 400 },
      );

    if (new Date() > record.expiresAt)
      return NextResponse.json(
        { success: false, message: "OTP expired. Please request a new one." },
        { status: 400 },
      );

    if (record.otp !== otp)
      return NextResponse.json(
        { success: false, message: "Incorrect OTP. Please try again." },
        { status: 400 },
      );

    // Mark as verified instead of deleting
    await Otp.findOneAndUpdate(
      { email: email.toLowerCase() },
      { verified: true },
    );

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully.",
    });
  } catch (err) {
    console.error("[FORGOT-PASSWORD-VERIFY ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error." },
      { status: 500 },
    );
  }
}
