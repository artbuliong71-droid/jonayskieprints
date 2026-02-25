// app/api/verify-otp/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { message: "Email and OTP are required." },
        { status: 400 },
      );
    }

    const record = global.otpStore?.[email];

    if (!record) {
      return NextResponse.json(
        { message: "No OTP found. Please request a new one." },
        { status: 400 },
      );
    }

    if (new Date() > record.expiresAt) {
      delete global.otpStore[email];
      return NextResponse.json(
        { message: "OTP has expired. Please request a new one." },
        { status: 400 },
      );
    }

    if (record.otp !== otp) {
      return NextResponse.json(
        { message: "Invalid OTP. Please try again." },
        { status: 400 },
      );
    }

    // Mark as verified
    global.otpStore[email].verified = true;

    return NextResponse.json(
      { message: "OTP verified successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("[verify-otp]", error);
    return NextResponse.json(
      { message: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}
