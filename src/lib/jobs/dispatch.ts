import { DateTime } from "luxon";
import type { ScheduledNotification, User } from "@prisma/client";

import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { env } from "@/lib/env";
import { sendPushover } from "@/lib/pushover";

const MAX_ATTEMPTS = 5;
const BATCH = 200;

type DueRow = ScheduledNotification & { user: User };

/** Group key: one message per user per local calendar day of the send. */
function groupKey(row: DueRow): string {
  const localDate = DateTime.fromJSDate(row.scheduledFor)
    .setZone(row.user.timezone)
    .toISODate();
  return `${row.userId}:${localDate}`;
}

/** Human label for the grouped day, relative to the user's "now". */
function dayLabel(row: DueRow, now: DateTime): string {
  const date = DateTime.fromJSDate(row.scheduledFor).setZone(row.user.timezone);
  const days = Math.round(date.startOf("day").diff(now.setZone(row.user.timezone).startOf("day"), "days").days);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return date.toFormat("MMM d");
}

async function markGroup(
  rows: DueRow[],
  data: Parameters<typeof prisma.scheduledNotification.updateMany>[0]["data"],
) {
  await prisma.scheduledNotification.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data,
  });
}

/**
 * Send every PENDING notification whose time has come. Notifications for the
 * same user on the same local day are combined into a single Pushover message.
 * Idempotent and safe to run every minute; transient failures stay PENDING
 * (retried) until MAX_ATTEMPTS.
 */
export async function runDispatch(
  now: Date = new Date(),
): Promise<{ processed: number; sent: number; failed: number; skipped: number }> {
  const nowDt = DateTime.fromJSDate(now);
  const due = (await prisma.scheduledNotification.findMany({
    where: { status: "PENDING", scheduledFor: { lte: now } },
    orderBy: { scheduledFor: "asc" },
    take: BATCH,
    include: { user: true },
  })) as DueRow[];

  // Group by user + local day.
  const groups = new Map<string, DueRow[]>();
  for (const row of due) {
    const key = groupKey(row);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(row);
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const rows of groups.values()) {
    const user = rows[0].user;

    if (!user.pushoverUserKey) {
      await markGroup(rows, { status: "SKIPPED", error: "No Pushover key connected.", sentAt: now });
      skipped += rows.length;
      continue;
    }

    // Build the message: a single reminder, or a combined digest.
    let title: string;
    let message: string;
    let url: string;
    if (rows.length === 1) {
      title = rows[0].title;
      message = rows[0].body;
      url = rows[0].url ?? `${env.appUrl}/dashboard`;
    } else {
      title = `${rows.length} reminders ${dayLabel(rows[0], nowDt)}`;
      message = rows.map((r) => `• ${r.body}`).join("\n");
      url = `${env.appUrl}/upcoming`;
    }

    if (env.dryRun) {
      console.log(`[daze:dispatch][dry-run] ${title}\n${message}`);
      await markGroup(rows, { status: "SENT", sentAt: now });
      sent += rows.length;
      continue;
    }

    const earliest = Math.min(...rows.map((r) => r.scheduledFor.getTime()));
    const result = await sendPushover({
      userKey: decrypt(user.pushoverUserKey),
      device: user.pushoverDevice,
      title,
      message,
      url,
      urlTitle: "Open in Daze",
      timestamp: Math.floor(earliest / 1000),
    });

    if (result.ok) {
      await markGroup(rows, {
        status: "SENT",
        sentAt: now,
        attempts: { increment: 1 },
        pushoverReceipt: result.receipt ?? null,
        error: null,
      });
      sent += rows.length;
    } else {
      // Retry the whole group next tick; give up per-row after MAX_ATTEMPTS.
      const giveUpRows = rows.filter((r) => r.attempts + 1 >= MAX_ATTEMPTS);
      const retryRows = rows.filter((r) => r.attempts + 1 < MAX_ATTEMPTS);
      if (giveUpRows.length) {
        await markGroup(giveUpRows, {
          status: "FAILED",
          attempts: { increment: 1 },
          error: result.error,
        });
        failed += giveUpRows.length;
      }
      if (retryRows.length) {
        await markGroup(retryRows, {
          attempts: { increment: 1 },
          error: result.error,
        });
      }
    }
  }

  return { processed: due.length, sent, failed, skipped };
}
