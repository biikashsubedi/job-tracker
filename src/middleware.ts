import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const { pathname } = nextUrl;
  const isLoggedIn = !!req.auth;

  // Auth.js's own endpoints must stay reachable (sign-in callback, csrf, etc.)
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  if (pathname === "/login") {
    // Already signed in? Skip the login page.
    if (isLoggedIn) return NextResponse.redirect(new URL("/", nextUrl));
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    // APIs get a JSON 401; pages get redirected to /login with a callbackUrl.
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname + nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Run on every route except Next internals and static asset files. The
  // login page and /api/auth are matched here but allowed inside the handler.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
