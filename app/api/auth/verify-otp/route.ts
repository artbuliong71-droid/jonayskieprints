import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { Otp } from "@/models/otp";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: "Email and OTP are required." },
        { status: 400 },
      );
    }

    const record = await Otp.findOne({ email: email.toLowerCase() });

    if (!record) {
      return NextResponse.json(
        { success: false, message: "OTP not found. Please register again." },
        { status: 400 },
      );
    }

    if (new Date() > record.expiresAt) {
      await Otp.deleteOne({ email });
      return NextResponse.json(
        { success: false, message: "OTP expired. Please register again." },
        { status: 400 },
      );
    }

    if (record.otp !== otp) {
      return NextResponse.json(
        { success: false, message: "Incorrect OTP. Please try again." },
        { status: 400 },
      );
    }

    const { first_name, last_name, phone, password } = record.userData;

    await User.create({
      first_name,
      last_name,
      email: email.toLowerCase(),
      phone,
      password,
      role: "customer",
    });

    await Otp.deleteOne({ email });

    return NextResponse.json({
      success: true,
      message: "Account created successfully! Please sign in.",
    });
  } catch (err: any) {
    console.error("[VERIFY-OTP ERROR]", err);
    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Email is already registered." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, message: "Server error. Please try again." },
      { status: 500 },
    );
  }
}
