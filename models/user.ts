import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  role: "customer" | "admin";
  avatarUrl?: string | null;
  created_at: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  first_name: { type: String, required: true, trim: true },
  last_name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: { type: String, default: "" },
  password: { type: String, default: "" },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  avatarUrl: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
});

// ── Hash password before saving ───────────────────────────────────────────────
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  if (!this.password) return;
  // bcrypt hashes always start with $2a$ or $2b$ and are 60 chars
  const alreadyHashed = /^\$2[ab]\$\d+\$/.test(this.password);
  if (alreadyHashed) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// ── Compare password ──────────────────────────────────────────────────────────
UserSchema.methods.comparePassword = async function (
  candidate: string,
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

// ✅ Always delete cached model first so methods are never stripped
if (mongoose.models.User) {
  delete (mongoose.models as any).User;
}
export const User = mongoose.model<IUser>("User", UserSchema);
