// app/api/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { OtpModel } from "@/models/otp";

export async function POST(req: NextRequest) {
  try {
    const { email, newPassword, confirmPassword } = await req.json();

    if (!email || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: "All fields are required." },
        { status: 400 },
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: "Passwords do not match." },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    await connectDB();

    // Check OTP was verified in MongoDB
    const record = await OtpModel.findOne({ email });
    if (!record || !record.verified) {
      return NextResponse.json(
        {
          success: false,
          message: "OTP not verified. Please verify OTP first.",
        },
        { status: 400 },
      );
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 },
      );
    }

    // Set new password — pre("save") hook will hash it automatically
    user.password = newPassword;
    await user.save();

    // Clean up OTP from MongoDB
    await OtpModel.deleteOne({ email });

    return NextResponse.json(
      {
        success: true,
        message: "Password reset successfully. You can now log in.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}
