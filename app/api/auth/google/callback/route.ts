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
    // 1. Exchange code for Google tokens
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
      return NextResponse.redirect(
        `${process.env.CLIENT_URL}/login?error=token_failed`,
      );
    }

    // 2. Get user info from Google
    const googleUserRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    );
    const googleUser = await googleUserRes.json();

    // 3. Find or create user in MongoDB
    await connectDB();
    const db = mongoose.connection.db!;
    const users = db.collection("users");

    let user = await users.findOne({ googleId: googleUser.id });

    if (!user) {
      // Check if email already exists (user registered manually before)
      const existingByEmail = await users.findOne({ email: googleUser.email });

      if (existingByEmail) {
        // Link Google to existing account
        await users.updateOne(
          { _id: existingByEmail._id },
          { $set: { googleId: googleUser.id, avatar: googleUser.picture } },
        );
        user = await users.findOne({ _id: existingByEmail._id });
      } else {
        // Brand new user — create account
        const result = await users.insertOne({
          googleId: googleUser.id,
          email: googleUser.email,
          first_name: googleUser.given_name || googleUser.name,
          last_name: googleUser.family_name || "",
          avatar: googleUser.picture,
          phone: "",
          role: "customer",
          createdAt: new Date(),
        });
        user = await users.findOne({ _id: result.insertedId });
      }
    }

    if (!user) {
      return NextResponse.redirect(
        `${process.env.CLIENT_URL}/login?error=user_not_found`,
      );
    }

    // 4. Set session cookie — same as your existing login
    await setSession({
      userId: user._id.toString(),
      email: user.email,
      role: user.role || "customer",
      first_name: user.first_name || "",
    });

    // 5. Redirect based on role
    const redirect = user.role === "admin" ? "/dashboard" : "/user/dashboard";
    return NextResponse.redirect(`${process.env.CLIENT_URL}${redirect}`);
  } catch (err) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect(
      `${process.env.CLIENT_URL}/login?error=server_error`,
    );
  }
}
