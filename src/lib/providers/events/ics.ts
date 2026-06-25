import { z } from "zod";
import ical from "node-ical";

import type { EventDelta, EventProvider, NormalizedEvent } from "./types";

// Calendar (.ics) event source. Implements the same EventProvider interface as
// the holiday API, so the scheduler and UI treat ICS feeds identically.

export const icsConfigSchema = z.object({
  url: z.string().url(),
});

type IcalComponent = {
  type?: string;
  uid?: string;
  summary?: string;
  start?: Date;
  datetype?: string; // "date" for all-day
  rrule?: { options?: { freq?: number } };
};

// rrule FREQ constant for YEARLY (from the `rrule` lib node-ical uses).
const FREQ_YEARLY = 0;

function monthDay(ev: IcalComponent): { month: number; day: number; year: number } {
  const d = ev.start as Date;
  // All-day (VALUE=DATE) events are floating; read UTC parts to avoid tz drift.
  if (ev.datetype === "date") {
    return { month: d.getUTCMonth() + 1, day: d.getUTCDate(), year: d.getUTCFullYear() };
  }
  return { month: d.getMonth() + 1, day: d.getDate(), year: d.getFullYear() };
}

export class IcsProvider implements EventProvider {
  async sync(config: unknown): Promise<EventDelta> {
    const { url } = icsConfigSchema.parse(config);

    const data = (await ical.async.fromURL(url)) as Record<string, IcalComponent>;
    const upserts: NormalizedEvent[] = [];

    for (const ev of Object.values(data)) {
      if (ev.type !== "VEVENT" || !ev.start || !ev.summary) continue;

      const { month, day, year } = monthDay(ev);
      const yearlyRecurring = ev.rrule?.options?.freq === FREQ_YEARLY;
      const uid = ev.uid ?? `${ev.summary}-${year}-${month}-${day}`;

      upserts.push({
        externalId: yearlyRecurring ? uid : `${uid}:${year}`,
        title: ev.summary,
        month,
        day,
        year: yearlyRecurring ? null : year,
        recurringAnnually: yearlyRecurring,
      });
    }

    return { upserts, deletedExternalIds: [] };
  }
}
