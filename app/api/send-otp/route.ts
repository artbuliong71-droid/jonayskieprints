import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const otpStore = new Map<string, { otp: string; expires: number }>();

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email)
    return NextResponse.json(
      { success: false, message: "Email required" },
      { status: 400 },
    );

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 }); // 5 min expiry

  const transporter = nodemailer.createTransport({
    service: "gmail",
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
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  const otp = req.nextUrl.searchParams.get("otp");

  if (!email || !otp)
    return NextResponse.json(
      { success: false, message: "Missing params" },
      { status: 400 },
    );

  const record = otpStore.get(email);
  if (!record)
    return NextResponse.json(
      { success: false, message: "No OTP found for this email" },
      { status: 400 },
    );
  if (Date.now() > record.expires) {
    otpStore.delete(email);
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

  otpStore.delete(email);
  return NextResponse.json({ success: true, message: "Email verified" });
}
