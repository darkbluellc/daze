import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { exchangeCode, fetchAccountIdentity } from "@/lib/google/oauth";
import { syncContactSource } from "@/lib/services/contact-sync";

function redirect(path: string) {
  return NextResponse.redirect(new URL(path, process.env.AUTH_URL));
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return redirect("/login");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieState = req.cookies.get("daze_oauth_state")?.value;

  if (error) return redirect("/connections?error=google_denied");
  if (!code || !state || !cookieState || state !== cookieState) {
    return redirect("/connections?error=google_state");
  }

  try {
    const tokens = await exchangeCode(code);
    const identity = await fetchAccountIdentity(tokens.accessToken);

    const source = await prisma.contactSource.upsert({
      where: {
        userId_type_externalAccountId: {
          userId: session.user.id,
          type: "GOOGLE",
          externalAccountId: identity.externalAccountId,
        },
      },
      create: {
        userId: session.user.id,
        type: "GOOGLE",
        externalAccountId: identity.externalAccountId,
        accountEmail: identity.email,
        accessToken: encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        tokenExpiresAt: tokens.expiryDate ? new Date(tokens.expiryDate) : null,
        scope: tokens.scope,
        status: "OK",
      },
      update: {
        accountEmail: identity.email,
        accessToken: encrypt(tokens.accessToken),
        // Keep a previously stored refresh token if Google didn't return one.
        ...(tokens.refreshToken
          ? { refreshToken: encrypt(tokens.refreshToken) }
          : {}),
        tokenExpiresAt: tokens.expiryDate ? new Date(tokens.expiryDate) : null,
        scope: tokens.scope,
        status: "OK",
        lastError: null,
      },
    });

    // Initial import (best-effort; surface failures on the connections page).
    await syncContactSource(source.id);
  } catch {
    return redirect("/connections?error=google_sync");
  }

  const res = redirect("/birthdays?connected=google");
  res.cookies.delete("daze_oauth_state");
  return res;
}
