import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { setSession, getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

// ── GET: auth-check ───────────────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getSession();
    if (session?.userId) {
      return NextResponse.json({ loggedIn: true, role: session.role });
    }
    return NextResponse.json({ loggedIn: false });
  } catch {
    return NextResponse.json({ loggedIn: false });
  }
}

// ── POST: handle login ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    let email = "",
      password = "";
    const ct = req.headers.get("content-type") || "";

    if (ct.includes("application/json")) {
      const body = await req.json();
      email = (body.email as string)?.trim().toLowerCase() ?? "";
      password = (body.password as string) ?? "";
    } else {
      const fd = await req.formData();
      email = (fd.get("email") as string)?.trim().toLowerCase() ?? "";
      password = (fd.get("password") as string) ?? "";
    }

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 },
      );
    }

    await connectDB();

    // Select password explicitly in case schema ever uses select:false
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 },
      );
    }

    // ── Google account with no password yet — auto-generate and save it ──────
    if (!user.password) {
      const autoPassword = await bcrypt.hash(
        `google_${(user as any).googleId}_${process.env.JWT_SECRET || "jp_secret"}`,
        12,
      );
      user.password = autoPassword;
      await user.save();
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 },
      );
    }

    await setSession({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      first_name: user.first_name,
    });

    const redirect = user.role === "admin" ? "/dashboard" : "/user/dashboard";

    return NextResponse.json({
      success: true,
      message: `Welcome back, ${user.first_name}!`,
      redirect,
      user: {
        id: user._id.toString(),
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[LOGIN ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error. Please try again." },
      { status: 500 },
    );
  }
}
