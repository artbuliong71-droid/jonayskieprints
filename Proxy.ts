import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-this-secret-in-production",
);
const COOKIE_NAME = "jp_session";

async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as {
      userId: string;
      email: string;
      role: string;
      first_name: string;
    };
  } catch {
    return null;
  }
}

function withNoCache(res: NextResponse): NextResponse {
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private",
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSessionFromRequest(request);

  const isLoggedIn = !!session?.userId;
  const role = session?.role;

  if (pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      return withNoCache(NextResponse.redirect(new URL("/login", request.url)));
    }
    if (role !== "admin") {
      return withNoCache(
        NextResponse.redirect(new URL("/user/dashboard", request.url)),
      );
    }
  }

  if (pathname.startsWith("/user/dashboard")) {
    if (!isLoggedIn) {
      return withNoCache(NextResponse.redirect(new URL("/login", request.url)));
    }
    if (role === "admin") {
      return withNoCache(
        NextResponse.redirect(new URL("/dashboard", request.url)),
      );
    }
  }

  return withNoCache(NextResponse.next());
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/user/dashboard",
    "/user/dashboard/:path*",
    "/login",
  ],
};
