// app/api/verify-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Otp } from "@/models/otp";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: "Email and OTP are required." },
        { status: 400 },
      );
    }

    await connectDB();

    const record = await Otp.findOne({ email });

    if (!record) {
      return NextResponse.json(
        { success: false, message: "No OTP found. Please request a new one." },
        { status: 400 },
      );
    }

    if (new Date() > record.expiresAt) {
      await Otp.deleteOne({ email });
      return NextResponse.json(
        {
          success: false,
          message: "OTP has expired. Please request a new one.",
        },
        { status: 400 },
      );
    }

    if (record.otp !== otp) {
      return NextResponse.json(
        { success: false, message: "Invalid OTP. Please try again." },
        { status: 400 },
      );
    }

    // Mark as verified
    await Otp.findOneAndUpdate({ email }, { verified: true });

    return NextResponse.json(
      { success: true, message: "OTP verified successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("[verify-otp]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}
