import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

// ── OTP Model ──────────────────────────────────────────────────────
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  expires: { type: Date, required: true },
});
const OtpModel = mongoose.models.Otp || mongoose.model("Otp", otpSchema);

// ── POST: Send OTP ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email)
      return NextResponse.json(
        { success: false, message: "Email required" },
        { status: 400 },
      );

    await connectDB();

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    // Upsert — replace any existing OTP for this email
    await OtpModel.findOneAndUpdate(
      { email },
      { email, otp, expires },
      { upsert: true, new: true },
    );

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Jonayskie Prints" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your Verification Code — Jonayskie Prints",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #7c3aed; margin-bottom: 8px;">Verify your email</h2>
          <p style="color: #4b5563; margin-bottom: 24px;">Use the code below to complete your registration. It expires in <strong>5 minutes</strong>.</p>
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #0f0e11; background: #f5f3ff; padding: 20px; border-radius: 10px; text-align: center;">${otp}</div>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("[SEND OTP ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Failed to send OTP" },
      { status: 500 },
    );
  }
}

// ── GET: Verify OTP ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    const otp = req.nextUrl.searchParams.get("otp");

    if (!email || !otp)
      return NextResponse.json(
        { success: false, message: "Missing params" },
        { status: 400 },
      );

    await connectDB();

    const record = await OtpModel.findOne({ email });

    if (!record)
      return NextResponse.json(
        { success: false, message: "No OTP found for this email" },
        { status: 400 },
      );

    if (new Date() > record.expires) {
      await OtpModel.deleteOne({ email });
      return NextResponse.json(
        { success: false, message: "OTP has expired" },
        { status: 400 },
      );
    }

    if (record.otp !== otp)
      return NextResponse.json(
        { success: false, message: "Incorrect code" },
        { status: 400 },
      );

    await OtpModel.deleteOne({ email });
    return NextResponse.json({ success: true, message: "Email verified" });
  } catch (err) {
    console.error("[VERIFY OTP ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}
