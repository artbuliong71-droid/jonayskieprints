// models/otp.ts
import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false },
});

export const OtpModel = mongoose.models.Otp || mongoose.model("Otp", otpSchema);
