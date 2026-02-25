import { NextResponse } from "next/server";
import { clearSession, COOKIE_NAME } from "@/lib/auth";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 0,
  path: "/",
};

export async function POST() {
  try {
    await clearSession();
    const res = NextResponse.json({ success: true, message: "Logged out successfully." });
    res.cookies.set(COOKIE_NAME, "", COOKIE_OPTIONS); // ✅ explicitly clear on response
    return res;
  } catch (err) {
    console.error("[LOGOUT ERROR]", err);
    const res = NextResponse.json({ success: false, message: "Logout failed." });
    res.cookies.set(COOKIE_NAME, "", COOKIE_OPTIONS); // ✅ clear even on error
    return res;
  }
}

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = NextResponse.redirect(new URL("/login", baseUrl));

  try {
    await clearSession();
  } catch (err) {
    console.error("[LOGOUT GET ERROR]", err);
  }

  res.cookies.set(COOKIE_NAME, "", COOKIE_OPTIONS); // ✅ always clear on response
  return res;
}