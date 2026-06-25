import { DateTime } from "luxon";

import type { LeadTimeUnit } from "@prisma/client";

// All recurring-event math (birthdays, annual holidays) lives here so the
// Birthdays UI and the scheduler agree. Everything is timezone-aware.

/** Clamp a day to the month's length (handles Feb 29 in non-leap years). */
export function clampDay(year: number, month: number, day: number): number {
  const daysInMonth = DateTime.fromObject({ year, month, day: 1 }).daysInMonth!;
  return Math.min(day, daysInMonth);
}

/** The month/day occurrence in a specific year, at local start-of-day. */
export function occurrenceInYear(
  year: number,
  month: number,
  day: number,
  tz: string,
): DateTime {
  return DateTime.fromObject(
    { year, month, day: clampDay(year, month, day) },
    { zone: tz },
  ).startOf("day");
}

/**
 * The next occurrence of a recurring month/day on or after `now` (today counts).
 * Returns local start-of-day in `tz`.
 */
export function nextOccurrence(
  month: number,
  day: number,
  tz: string,
  now: DateTime = DateTime.now(),
): DateTime {
  const today = now.setZone(tz).startOf("day");
  let occ = occurrenceInYear(today.year, month, day, tz);
  if (occ < today) occ = occurrenceInYear(today.year + 1, month, day, tz);
  return occ;
}

/** Whole years between a birth year and an occurrence (the age on that day). */
export function ageOnOccurrence(
  birthYear: number | null | undefined,
  occurrence: DateTime,
): number | null {
  if (!birthYear) return null;
  return occurrence.year - birthYear;
}

/** Move an occurrence earlier by a lead time (e.g. 1 WEEK before). */
export function subtractLeadTime(
  date: DateTime,
  value: number,
  unit: LeadTimeUnit,
): DateTime {
  switch (unit) {
    case "DAY":
      return date.minus({ days: value });
    case "WEEK":
      return date.minus({ weeks: value });
    case "MONTH":
      return date.minus({ months: value });
  }
}

/** Apply a local "HH:mm" send time to a date, in the given timezone. */
export function atLocalTime(
  date: DateTime,
  hhmm: string,
  tz: string,
): DateTime {
  const [hour, minute] = hhmm.split(":").map(Number);
  return date.setZone(tz).set({ hour, minute, second: 0, millisecond: 0 });
}

export function formatLeadTime(value: number, unit: LeadTimeUnit): string {
  const unitLabel = unit.toLowerCase();
  return `${value} ${value === 1 ? unitLabel : `${unitLabel}s`}`;
}

/** Friendly "in N days" / "today" / "tomorrow" relative to now. */
export function describeUntil(
  occurrence: DateTime,
  now: DateTime = DateTime.now(),
): string {
  const days = Math.round(
    occurrence.startOf("day").diff(now.setZone(occurrence.zoneName!).startOf("day"), "days")
      .days,
  );
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days} days`;
  if (days < 31) return `in ${Math.round(days / 7)} week${days < 14 ? "" : "s"}`;
  return occurrence.toFormat("MMM d");
}
