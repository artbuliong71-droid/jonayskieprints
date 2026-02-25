// app/api/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";

export async function POST(req: NextRequest) {
  try {
    const { email, newPassword, confirmPassword } = await req.json();

    if (!email || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { message: "All fields are required." },
        { status: 400 },
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { message: "Passwords do not match." },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    // Check OTP was verified
    const record = global.otpStore?.[email];
    if (!record || !record.verified) {
      return NextResponse.json(
        { message: "OTP not verified. Please verify OTP first." },
        { status: 400 },
      );
    }

    await connectDB();

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    // Set new password — UserSchema.pre("save") will hash it automatically
    user.password = newPassword;
    await user.save();

    // Clean up OTP store
    delete global.otpStore[email];

    return NextResponse.json(
      { message: "Password reset successfully. You can now log in." },
      { status: 200 },
    );
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json(
      { message: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}
