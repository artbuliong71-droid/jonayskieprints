import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { Otp } from "@/models/otp";
import { sendOtpEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const first_name = body.first_name?.trim();
    const last_name = body.last_name?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim();
    const password = body.password;
    const confirmPassword = body.confirmPassword;

    if (!first_name || !last_name || !email || !phone || !password) {
      return NextResponse.json(
        { success: false, message: "All fields are required." },
        { status: 400 },
      );
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Invalid email format." },
        { status: 400 },
      );
    }
    if (!/^(?=.*[A-Za-z])[A-Za-z\s'-]+$/.test(first_name)) {
      return NextResponse.json(
        {
          success: false,
          message: "First name must not contain numbers.",
        },
        { status: 400 },
      );
    }
    if (!/^(?=.*[A-Za-z])[A-Za-z\s'-]+$/.test(last_name)) {
      return NextResponse.json(
        {
          success: false,
          message: "Last name must not contain numbers.",
        },
        { status: 400 },
      );
    }
    const normalizedPhone = phone.replace(/\D/g, "");
    if (!/^(09\d{9}|639\d{9})$/.test(normalizedPhone)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Phone number must be a valid Philippine mobile number.",
        },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }
    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: "Passwords do not match." },
        { status: 400 },
      );
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Email is already registered." },
        { status: 409 },
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.findOneAndUpdate(
      { email },
      {
        otp,
        userData: {
          first_name,
          last_name,
          email,
          phone: normalizedPhone,
          password,
        },
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      { upsert: true, new: true },
    );

    await sendOtpEmail(email, otp);

    return NextResponse.json({
      success: true,
      message: "OTP sent to your email.",
    });
  } catch (err: any) {
    console.error("[SEND-OTP ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error. Please try again." },
      { status: 500 },
    );
  }
}
