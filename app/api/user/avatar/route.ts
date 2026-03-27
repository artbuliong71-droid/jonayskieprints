import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated." },
        { status: 401 },
      );
    }

    const { avatarUrl } = await req.json();

    if (!avatarUrl || typeof avatarUrl !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid avatar URL." },
        { status: 400 },
      );
    }

    try {
      new URL(avatarUrl);
    } catch {
      return NextResponse.json(
        { success: false, message: "Avatar URL must be a valid URL." },
        { status: 400 },
      );
    }

    await connectDB();

    const user = await User.findByIdAndUpdate(
      session.userId,
      { avatarUrl },
      { new: true },
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { avatarUrl: user.avatarUrl },
    });
  } catch (err) {
    console.error("[USER AVATAR PATCH ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Server error." },
      { status: 500 },
    );
  }
}
