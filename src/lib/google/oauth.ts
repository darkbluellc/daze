import { google } from "googleapis";

import { env } from "@/lib/env";

// Scopes: read-only contacts plus basic identity to label the connected account.
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/contacts.readonly",
];

export class GoogleNotConfiguredError extends Error {
  constructor() {
    super("Google OAuth is not configured on this instance.");
    this.name = "GoogleNotConfiguredError";
  }
}

export function isGoogleConfigured(): boolean {
  return Boolean(env.google.clientId && env.google.clientSecret);
}

export function createOAuthClient() {
  if (!isGoogleConfigured()) throw new GoogleNotConfiguredError();
  return new google.auth.OAuth2(
    env.google.clientId,
    env.google.clientSecret,
    env.google.redirectUri,
  );
}

/** Consent URL. `state` is an anti-CSRF nonce we also store in a cookie. */
export function buildAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline", // request a refresh token
    prompt: "consent", // ensure refresh token is returned on re-link
    include_granted_scopes: true,
    scope: GOOGLE_SCOPES,
    state,
  });
}

export type GoogleTokens = {
  accessToken: string;
  refreshToken?: string | null;
  expiryDate?: number | null;
  scope?: string | null;
};

export async function exchangeCode(code: string): Promise<GoogleTokens> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return {
    accessToken: tokens.access_token ?? "",
    refreshToken: tokens.refresh_token ?? null,
    expiryDate: tokens.expiry_date ?? null,
    scope: tokens.scope ?? null,
  };
}

/** Read the connected account's identity (sub + email) from an access token. */
export async function fetchAccountIdentity(accessToken: string) {
  const client = createOAuthClient();
  client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  return { externalAccountId: data.id ?? "", email: data.email ?? null };
}

/**
 * Return a usable access token for a stored source, refreshing if it has
 * expired. Returns the (possibly refreshed) tokens so the caller can persist.
 */
export async function ensureAccessToken(input: {
  accessToken: string | null;
  refreshToken: string | null;
  expiryDate: number | null;
}): Promise<GoogleTokens> {
  const client = createOAuthClient();
  client.setCredentials({
    access_token: input.accessToken ?? undefined,
    refresh_token: input.refreshToken ?? undefined,
    expiry_date: input.expiryDate ?? undefined,
  });

  // getAccessToken() refreshes automatically when expired (uses refresh_token).
  const { token } = await client.getAccessToken();
  const creds = client.credentials;
  return {
    accessToken: token ?? input.accessToken ?? "",
    refreshToken: creds.refresh_token ?? input.refreshToken,
    expiryDate: creds.expiry_date ?? input.expiryDate,
    scope: creds.scope ?? null,
  };
}
