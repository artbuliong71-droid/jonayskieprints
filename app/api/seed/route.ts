import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";

export async function GET() {
  try {
    await connectDB();

    const existing = await User.findOne({ email: "admin@jonayskieprints.com" });
    if (existing) {
      return NextResponse.json({ message: "Admin already exists." });
    }

    // No need to hash manually — your UserSchema pre-save hook does it automatically
    await User.create({
      first_name: "Admin",
      last_name: "Admin",
      email: "admin@jonayskieprints.com",
      phone: "",
      password: "Admin@12345!",
      role: "admin",
    });

    return NextResponse.json({ message: "✅ Admin created successfully!" });
  } catch (err) {
    console.error("[SEED ERROR]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}