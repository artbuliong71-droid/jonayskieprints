import mongoose, { Schema, models } from "mongoose";

const OtpSchema = new Schema({
  email: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  userData: { type: Object, required: true },
  expiresAt: { type: Date, required: true },
});

OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = models.Otp || mongoose.model("Otp", OtpSchema);
export const Otp = Otp; // alias so both names work
