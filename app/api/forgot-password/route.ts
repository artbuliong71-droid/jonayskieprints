// app/api/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { OtpModel } from "@/models/otp";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER as string,
    pass: process.env.EMAIL_PASS as string,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required." },
        { status: 400 },
      );
    }

    await connectDB();

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "No account found with this email." },
        { status: 404 },
      );
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save to MongoDB (upsert — replaces existing OTP for this email)
    await OtpModel.findOneAndUpdate(
      { email },
      { otp, expiresAt, verified: false },
      { upsert: true, new: true },
    );

    // Send OTP email
    await transporter.sendMail({
      from: `"Jonayskie Prints" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Password Reset OTP",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
          <h2 style="color: #7c3aed;">Password Reset Request</h2>
          <p>Hi ${user.first_name},</p>
          <p>Your one-time password (OTP) for resetting your password is:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #7c3aed; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP is valid for <strong>10 minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">Jonayskie Prints</p>
        </div>
      `,
    });

    return NextResponse.json(
      { success: true, message: "OTP sent to your email." },
      { status: 200 },
    );
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}
