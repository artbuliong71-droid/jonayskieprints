import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string) {
  await transporter.sendMail({
    from: `"Jonayskie Prints" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your OTP Verification Code",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#7C3AED;">Verify your email</h2>
        <p>Use the code below to complete your registration. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;padding:24px;background:#f5f3ff;border-radius:8px;color:#7C3AED;">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:12px;margin-top:24px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
