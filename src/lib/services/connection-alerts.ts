import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { env } from "@/lib/env";
import { sendPushover } from "@/lib/pushover";

// "Self-healing" connection alerts: when a contact source stops working because
// its OAuth grant was revoked/expired, tell the user via their (still working)
// Pushover so reminders don't silently stop. We only alert once per outage.

const AUTH_ERROR_PATTERNS = [
  "invalid_grant",
  "invalid_token",
  "invalid_request",
  "unauthorized",
  "token has been expired or revoked",
  "no refresh token",
];

/** Heuristic: does this error mean the user must re-authorize? */
export function isAuthError(err: unknown): boolean {
  const code = (err as { code?: number; status?: number })?.code;
  if (code === 401 || code === 403) return true;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return AUTH_ERROR_PATTERNS.some((p) => msg.includes(p));
}

/**
 * Notify the user (once) that a contact source needs reconnecting. No-op if the
 * user has no Pushover key or we've already alerted for this outage.
 */
export async function alertContactSourceBroken(sourceId: string): Promise<void> {
  const source = await prisma.contactSource.findUnique({
    where: { id: sourceId },
    include: { user: true },
  });
  if (!source || source.alertSentAt) return;

  const { user } = source;
  if (user.pushoverUserKey) {
    const account = source.accountEmail ? ` (${source.accountEmail})` : "";
    const res = await sendPushover({
      userKey: decrypt(user.pushoverUserKey),
      device: user.pushoverDevice,
      title: "⚠️ Daze needs you to reconnect",
      message: `Daze lost access to your Google Contacts${account}. Reconnect to keep getting reminders.`,
      url: `${env.appUrl}/connections`,
      urlTitle: "Reconnect in Daze",
      priority: 1,
    });
    if (!res.ok) {
      // Couldn't reach Pushover; leave alertSentAt unset so we retry next time.
      return;
    }
  }

  await prisma.contactSource.update({
    where: { id: source.id },
    data: { alertSentAt: new Date() },
  });
}
