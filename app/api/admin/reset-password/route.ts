import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";

const ADMIN_RESET_SECRET = process.env.ADMIN_RESET_SECRET;

export async function POST(req: Request) {
  try {
    const { secret, newPassword } = await req.json();

    if (secret !== ADMIN_RESET_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const admin = await User.findOne({ email: "admin@jonayskieprints.com" });
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    admin.password = newPassword;
    await admin.save();

    return NextResponse.json({ message: "✅ Password updated!" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
