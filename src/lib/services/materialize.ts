import { DateTime } from "luxon";

import { prisma } from "@/lib/db";
import {
  nextOccurrence,
  occurrenceInYear,
  ageOnOccurrence,
  subtractLeadTime,
  atLocalTime,
  formatLeadTime,
} from "@/lib/dates";

const DEFAULT_HORIZON_DAYS = 45;

type Slot = {
  leadTimeId: string | null;
  scheduledFor: DateTime;
  title: string;
  body: string;
};

/** A date-only UTC Date for the @db.Date column (no tz drift). */
function toDateOnlyUTC(occ: DateTime): Date {
  return new Date(Date.UTC(occ.year, occ.month - 1, occ.day));
}

function dedupeKey(
  subscriptionId: string,
  leadTimeId: string | null,
  occ: DateTime,
): string {
  return `${subscriptionId}:${leadTimeId ?? "dayof"}:${occ.toISODate()}`;
}

/**
 * Recompute the upcoming scheduled notifications for a user from their enabled
 * subscriptions. Idempotent: existing PENDING rows are upserted by a stable
 * dedupe key, and PENDING rows that no longer apply are pruned. SENT rows are
 * never touched.
 */
export async function materializeUser(
  userId: string,
  opts: { horizonDays?: number; now?: DateTime } = {},
): Promise<{ scheduled: number }> {
  const horizonDays = opts.horizonDays ?? DEFAULT_HORIZON_DAYS;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const tz = user.timezone;
  const now = (opts.now ?? DateTime.now()).setZone(tz);
  const horizonEnd = now.plus({ days: horizonDays });

  const subscriptions = await prisma.subscription.findMany({
    where: { userId, enabled: true },
    include: {
      contact: true,
      event: true,
      leadTimes: { include: { leadTime: true } },
    },
  });

  const liveKeys = new Set<string>();
  let scheduled = 0;

  for (const sub of subscriptions) {
    const effectiveTime = sub.dayOfTimeOverride || user.defaultNotifyTime;

    // Resolve this subscription's occurrence date + display facts.
    let occ: DateTime;
    let title: string;
    let bodyToday: string;
    let leadPhrase: (rel: string) => string;

    if (sub.contact) {
      const c = sub.contact;
      occ = nextOccurrence(c.birthdayMonth, c.birthdayDay, tz, now);
      const age = ageOnOccurrence(c.birthdayYear, occ);
      title = `🎂 ${c.displayName}'s birthday`;
      bodyToday = age
        ? `${c.displayName} turns ${age} today!`
        : `It's ${c.displayName}'s birthday today!`;
      leadPhrase = (rel) =>
        age
          ? `${c.displayName}'s birthday is ${rel} — they turn ${age}.`
          : `${c.displayName}'s birthday is ${rel}.`;
    } else if (sub.event) {
      const e = sub.event;
      if (e.recurringAnnually || e.year == null) {
        occ = nextOccurrence(e.month, e.day, tz, now);
      } else {
        occ = occurrenceInYear(e.year, e.month, e.day, tz);
        if (occ < now.startOf("day")) continue; // one-off already passed
      }
      title = `🎉 ${e.title}`;
      bodyToday = `${e.title} is today.`;
      leadPhrase = (rel) => `${e.title} is ${rel}.`;
    } else {
      continue;
    }

    const slots: Slot[] = [];

    if (sub.sendDayOf) {
      slots.push({
        leadTimeId: null,
        scheduledFor: atLocalTime(occ, effectiveTime, tz),
        title,
        body: bodyToday,
      });
    }

    for (const link of sub.leadTimes) {
      const lt = link.leadTime;
      const leadDate = subtractLeadTime(occ, lt.value, lt.unit);
      slots.push({
        leadTimeId: lt.id,
        scheduledFor: atLocalTime(leadDate, effectiveTime, tz),
        title,
        body: leadPhrase(`in ${formatLeadTime(lt.value, lt.unit)}`),
      });
    }

    for (const slot of slots) {
      // Skip slots in the past or beyond the horizon.
      if (slot.scheduledFor < now || slot.scheduledFor > horizonEnd) continue;

      const key = dedupeKey(sub.id, slot.leadTimeId, occ);
      liveKeys.add(key);

      const existing = await prisma.scheduledNotification.findUnique({
        where: { dedupeKey: key },
        select: { id: true, status: true },
      });

      if (!existing) {
        await prisma.scheduledNotification.create({
          data: {
            userId,
            subscriptionId: sub.id,
            leadTimeId: slot.leadTimeId,
            occurrenceDate: toDateOnlyUTC(occ),
            scheduledFor: slot.scheduledFor.toJSDate(),
            dedupeKey: key,
            title: slot.title,
            body: slot.body,
          },
        });
        scheduled += 1;
      } else if (existing.status === "PENDING") {
        // Keep PENDING rows in sync with config/time edits; never disturb a row
        // that already SENT/FAILED/SKIPPED for this occurrence.
        await prisma.scheduledNotification.update({
          where: { id: existing.id },
          data: {
            scheduledFor: slot.scheduledFor.toJSDate(),
            title: slot.title,
            body: slot.body,
          },
        });
        scheduled += 1;
      }
    }
  }

  // Prune PENDING rows that no longer correspond to a live slot (disabled subs,
  // removed lead times, time changes that moved a slot, …).
  await prisma.scheduledNotification.deleteMany({
    where: {
      userId,
      status: "PENDING",
      dedupeKey: { notIn: liveKeys.size ? Array.from(liveKeys) : ["__none__"] },
    },
  });

  return { scheduled };
}
