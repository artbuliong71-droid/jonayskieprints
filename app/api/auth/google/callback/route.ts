import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { setSession } from "@/lib/auth";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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

    // ── Auto-generate a stable password from Google ID so email/password
    //    login also works. Uses googleId as the base — same google account
    //    always produces the same auto-password.
    const autoPassword = await bcrypt.hash(
      `google_${googleUser.id}_${process.env.JWT_SECRET || "jp_secret"}`,
      12,
    );

    let user = await users.findOne({ googleId: googleUser.id });

    if (!user) {
      const existingByEmail = await users.findOne({ email: googleUser.email });

      if (existingByEmail) {
        // Link Google to existing email/password account
        // Only set password if the account has none (pure Google signup before this fix)
        const updateFields: Record<string, unknown> = {
          googleId: googleUser.id,
          avatar: googleUser.picture,
        };
        if (!existingByEmail.password) {
          updateFields.password = autoPassword;
        }
        await users.updateOne(
          { _id: existingByEmail._id },
          { $set: updateFields },
        );
        user = await users.findOne({ _id: existingByEmail._id });
      } else {
        // Brand new Google user — save with auto-generated password
        const result = await users.insertOne({
          googleId: googleUser.id,
          email: googleUser.email,
          first_name: googleUser.given_name || googleUser.name,
          last_name: googleUser.family_name || "",
          avatar: googleUser.picture,
          phone: "",
          role: "customer",
          password: autoPassword, // ← stored so email/password login works
          created_at: new Date(),
        });
        user = await users.findOne({ _id: result.insertedId });
      }
    } else {
      // Existing Google user — backfill password if missing (fixes old accounts)
      if (!user.password) {
        await users.updateOne(
          { _id: user._id },
          { $set: { password: autoPassword } },
        );
        user = await users.findOne({ _id: user._id });
      }
    }

    if (!user) {
      return NextResponse.redirect(
        `${process.env.CLIENT_URL}/login?error=user_not_found`,
      );
    }

    // 4. Set session
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
