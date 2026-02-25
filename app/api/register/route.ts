import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const formData        = await req.formData();
    const first_name      = (formData.get("first_name")      as string)?.trim();
    const last_name       = (formData.get("last_name")       as string)?.trim();
    const email           = (formData.get("email")           as string)?.trim().toLowerCase();
    const phone           = (formData.get("phone")           as string)?.trim();
    const password        = (formData.get("password")        as string);
    const confirmPassword = (formData.get("confirmPassword") as string);

    // ── Validation ──────────────────────────────────────────────────────────
    if (!first_name || !last_name || !email || !phone || !password) {
      return NextResponse.json(
        { success: false, message: "All fields are required." },
        { status: 400 }
      );
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Invalid email format." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: "Passwords do not match." },
        { status: 400 }
      );
    }

    // ── Check if email already exists ────────────────────────────────────────
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Email is already registered." },
        { status: 409 }
      );
    }

    // ── Create user (password hashed by pre-save hook in User model) ─────────
    const user = await User.create({
      first_name,
      last_name,
      email,
      phone,
      password,
      role: "customer",
    });

    return NextResponse.json({
      success: true,
      message: "Account created successfully! Please sign in.",
      user_id: user._id.toString(),
    });

  } catch (err: any) {
    console.error("[REGISTER ERROR]", err);

    // MongoDB duplicate key error
    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Email is already registered." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Server error. Please try again." },
      { status: 500 }
    );
  }
}