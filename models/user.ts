import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  role: "customer" | "admin";
  created_at: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  first_name: { type: String, required: true, trim: true },
  last_name:  { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:      { type: String, default: "" },
  password:   { type: String, required: true },
  role:       { type: String, enum: ["customer", "admin"], default: "customer" },
  created_at: { type: Date, default: Date.now },
});

// Hash password before saving
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

// ── FIX: Delete cached model before re-registering ──────────────────────────
// This prevents Next.js hot reload from losing the methods on the cached model
if (mongoose.models.User) {
  delete mongoose.models.User;
}

export const User = mongoose.model<IUser>("User", UserSchema);