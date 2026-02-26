import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { setSession } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      `${process.env.CLIENT_URL}/login?error=no_code`,
    );
  }

  try {
    // Step 1: Exchange code for Google access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.CLIENT_URL}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      console.error("Google token exchange failed:", tokens);
      return NextResponse.redirect(
        `${process.env.CLIENT_URL}/login?error=token_failed`,
      );
    }

    // Step 2: Get user info from Google
    const googleUserRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    );
    const googleUser = await googleUserRes.json();

    if (!googleUser.email) {
      return NextResponse.redirect(
        `${process.env.CLIENT_URL}/login?error=no_email`,
      );
    }

    // Step 3: Find or create user in MongoDB
    await connectDB();
    const db = mongoose.connection.db!;
    const users = db.collection("users");

    let user = await users.findOne({ googleId: googleUser.id });

    if (!user) {
      // Check if this email already exists (user registered with email/password before)
      const existingByEmail = await users.findOne({ email: googleUser.email });

      if (existingByEmail) {
        // Link Google ID to the existing account
        await users.updateOne(
          { _id: existingByEmail._id },
          { $set: { googleId: googleUser.id, avatar: googleUser.picture } },
        );
        user = await users.findOne({ _id: existingByEmail._id });
      } else {
        // Brand new user — create account automatically
        const result = await users.insertOne({
          googleId: googleUser.id,
          email: googleUser.email,
          first_name: googleUser.given_name || googleUser.name || "User",
          last_name: googleUser.family_name || "",
          avatar: googleUser.picture || "",
          phone: "",
          role: "customer",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        user = await users.findOne({ _id: result.insertedId });
      }
    }

    if (!user) {
      return NextResponse.redirect(
        `${process.env.CLIENT_URL}/login?error=user_not_found`,
      );
    }

    // Step 4: Set session cookie — uses your existing setSession from lib/auth.ts
    await setSession({
      userId: user._id.toString(),
      email: user.email,
      role: user.role || "customer",
      first_name: user.first_name || "",
    });

    // Step 5: Redirect based on role
    const redirectPath =
      user.role === "admin" ? "/dashboard" : "/user/dashboard";
    return NextResponse.redirect(`${process.env.CLIENT_URL}${redirectPath}`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(
      `${process.env.CLIENT_URL}/login?error=server_error`,
    );
  }
}
