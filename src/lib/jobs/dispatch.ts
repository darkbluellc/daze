import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { env } from "@/lib/env";
import { sendPushover } from "@/lib/pushover";

const MAX_ATTEMPTS = 5;
const BATCH = 100;

/**
 * Send every PENDING notification whose time has come. Idempotent and safe to
 * run every minute: each row transitions PENDING → SENT/FAILED/SKIPPED, and
 * transient failures stay PENDING (retried) until MAX_ATTEMPTS.
 */
export async function runDispatch(
  now: Date = new Date(),
): Promise<{ processed: number; sent: number; failed: number; skipped: number }> {
  const due = await prisma.scheduledNotification.findMany({
    where: { status: "PENDING", scheduledFor: { lte: now } },
    orderBy: { scheduledFor: "asc" },
    take: BATCH,
    include: { user: true },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const n of due) {
    const user = n.user;

    if (!user.pushoverUserKey) {
      await prisma.scheduledNotification.update({
        where: { id: n.id },
        data: { status: "SKIPPED", error: "No Pushover key connected.", sentAt: now },
      });
      skipped += 1;
      continue;
    }

    if (env.dryRun) {
      console.log(`[daze:dispatch][dry-run] ${n.title} — ${n.body}`);
      await prisma.scheduledNotification.update({
        where: { id: n.id },
        data: { status: "SENT", sentAt: now, attempts: n.attempts + 1 },
      });
      sent += 1;
      continue;
    }

    const result = await sendPushover({
      userKey: decrypt(user.pushoverUserKey),
      device: user.pushoverDevice,
      title: n.title,
      message: n.body,
      timestamp: Math.floor(n.scheduledFor.getTime() / 1000),
    });

    const attempts = n.attempts + 1;
    if (result.ok) {
      await prisma.scheduledNotification.update({
        where: { id: n.id },
        data: {
          status: "SENT",
          sentAt: now,
          attempts,
          pushoverReceipt: result.receipt ?? null,
          error: null,
        },
      });
      sent += 1;
    } else {
      // Keep retrying transient failures; give up after MAX_ATTEMPTS.
      const giveUp = attempts >= MAX_ATTEMPTS;
      await prisma.scheduledNotification.update({
        where: { id: n.id },
        data: {
          status: giveUp ? "FAILED" : "PENDING",
          attempts,
          error: result.error,
        },
      });
      if (giveUp) failed += 1;
    }
  }

  return { processed: due.length, sent, failed, skipped };
}
