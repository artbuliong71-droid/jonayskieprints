import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { setSession } from "@/lib/auth";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    let id_token = "";

    if (ct.includes("application/json")) {
      const body = await req.json();
      id_token = body.id_token ?? "";
    } else {
      const fd = await req.formData();
      id_token = (fd.get("id_token") as string) ?? "";
    }

    if (!id_token) {
      return NextResponse.json(
        { success: false, message: "Missing ID token." },
        { status: 400 },
      );
    }

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return NextResponse.json(
        { success: false, message: "Invalid token." },
        { status: 401 },
      );
    }

    await connectDB();

    // Find or create user
    let user = await User.findOne({ email: payload.email });
    if (!user) {
      user = await User.create({
        email: payload.email,
        first_name: payload.given_name ?? "",
        last_name: payload.family_name ?? "",
        role: "customer",
        phone: "",
      } as any);
    }

    await setSession({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      first_name: user.first_name,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[GOOGLE MOBILE ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error." },
      { status: 500 },
    );
  }
}
