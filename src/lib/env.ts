// Centralised, validated access to server-side environment variables.
// Import only from server code (route handlers, server actions, the worker).
//
// Everything is a getter so that *importing* this module never reads or
// validates env. Required vars are checked only when actually accessed at
// runtime — otherwise `next build` (which has no .env) would throw while
// collecting page data.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  get databaseUrl(): string {
    return required("DATABASE_URL");
  },
  get encryptionKey(): string {
    return required("DAZE_ENCRYPTION_KEY");
  },

  // Base URL for deep links in notifications (falls back to AUTH_URL / localhost).
  get appUrl(): string {
    return (
      optional("DAZE_APP_URL") ??
      optional("AUTH_URL") ??
      optional("NEXTAUTH_URL") ??
      "http://localhost:3000"
    );
  },

  get pushoverAppToken(): string | undefined {
    return optional("DAZE_PUSHOVER_APP_TOKEN");
  },

  get google() {
    return {
      clientId: optional("GOOGLE_CLIENT_ID"),
      clientSecret: optional("GOOGLE_CLIENT_SECRET"),
      redirectUri:
        optional("GOOGLE_REDIRECT_URI") ??
        "http://localhost:3000/api/connections/google/callback",
    };
  },

  // Empty => open registration. Otherwise a lowercase set of allowed emails.
  get allowedEmails(): string[] {
    return (optional("DAZE_ALLOWED_EMAILS") ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  },

  get dryRun(): boolean {
    return process.env.DAZE_DRY_RUN === "1";
  },
};

export function isRegistrationAllowed(email: string): boolean {
  if (env.allowedEmails.length === 0) return true;
  return env.allowedEmails.includes(email.trim().toLowerCase());
}
