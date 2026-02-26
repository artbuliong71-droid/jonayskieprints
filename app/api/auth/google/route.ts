import { NextResponse } from "next/server";

export async function GET() {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set(
    "redirect_uri",
    `${process.env.CLIENT_URL}/api/auth/google/callback`,
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(url.toString());
}
