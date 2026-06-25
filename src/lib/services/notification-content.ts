import { DateTime } from "luxon";

import { env } from "@/lib/env";
import { nextOccurrence, occurrenceInYear, ageOnOccurrence } from "@/lib/dates";

// Single source of truth for notification copy + deep-link URLs, shared by the
// materializer, the "send test" action, and same-day grouping.

export type ContactLike = {
  displayName: string;
  birthdayMonth: number;
  birthdayDay: number;
  birthdayYear: number | null;
  notes: string | null;
};

export type EventLike = {
  title: string;
  month: number;
  day: number;
  year: number | null;
  recurringAnnually: boolean;
};

export type SubscriptionTarget = {
  contact?: ContactLike | null;
  event?: EventLike | null;
};

/** Next relevant occurrence, or null for a one-off event that already passed. */
export function subscriptionOccurrence(
  sub: SubscriptionTarget,
  tz: string,
  now: DateTime,
): DateTime | null {
  if (sub.contact) {
    return nextOccurrence(sub.contact.birthdayMonth, sub.contact.birthdayDay, tz, now);
  }
  if (sub.event) {
    const e = sub.event;
    if (e.recurringAnnually || e.year == null) {
      return nextOccurrence(e.month, e.day, tz, now);
    }
    const occ = occurrenceInYear(e.year, e.month, e.day, tz);
    return occ < now.startOf("day") ? null : occ;
  }
  return null;
}

function birthdaysUrl() {
  return `${env.appUrl}/birthdays`;
}
function holidaysUrl() {
  return `${env.appUrl}/holidays`;
}

export type NotificationContent = { title: string; body: string; url: string };

/**
 * Build the title/body/url for one notification slot.
 * `leadPhrase` is e.g. "1 week" for a lead-time reminder, or null for day-of.
 */
export function buildNotificationContent(
  sub: SubscriptionTarget,
  occ: DateTime,
  leadPhrase: string | null,
): NotificationContent {
  if (sub.contact) {
    const c = sub.contact;
    const age = ageOnOccurrence(c.birthdayYear, occ);
    const note = c.notes?.trim() ? ` 📝 ${c.notes.trim()}` : "";

    if (!leadPhrase) {
      const base = age
        ? `${c.displayName} turns ${age} today!`
        : `It's ${c.displayName}'s birthday today!`;
      return { title: `🎂 ${c.displayName}'s birthday`, body: base + note, url: birthdaysUrl() };
    }

    const base = age
      ? `${c.displayName}'s birthday is in ${leadPhrase} — they turn ${age}.`
      : `${c.displayName}'s birthday is in ${leadPhrase}.`;
    return { title: `🎂 ${c.displayName}'s birthday`, body: base + note, url: birthdaysUrl() };
  }

  if (sub.event) {
    const e = sub.event;
    const body = leadPhrase ? `${e.title} is in ${leadPhrase}.` : `${e.title} is today.`;
    return { title: `🎉 ${e.title}`, body, url: holidaysUrl() };
  }

  return { title: "Daze reminder", body: "", url: env.appUrl };
}
