import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { buildAuthUrl, isGoogleConfigured } from "@/lib/google/oauth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.AUTH_URL));
  }
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(
      new URL("/connections?error=google_not_configured", process.env.AUTH_URL),
    );
  }

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildAuthUrl(state));
  res.cookies.set("daze_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
