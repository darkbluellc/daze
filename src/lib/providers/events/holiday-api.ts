import { z } from "zod";

import type { EventDelta, EventProvider, NormalizedEvent } from "./types";

// Public-holiday source backed by the free Nager.Date API.
// https://date.nager.at/swagger/index.html

const BASE = "https://date.nager.at/api/v3";

export const holidayConfigSchema = z.object({
  countryCode: z.string().length(2),
});

const nagerHoliday = z.object({
  date: z.string(), // YYYY-MM-DD
  localName: z.string(),
  name: z.string(),
  countryCode: z.string(),
});

export type AvailableCountry = { countryCode: string; name: string };

export async function fetchAvailableCountries(): Promise<AvailableCountry[]> {
  const res = await fetch(`${BASE}/AvailableCountries`, {
    next: { revalidate: 86_400 },
  });
  if (!res.ok) throw new Error("Could not load country list.");
  return (await res.json()) as AvailableCountry[];
}

async function fetchYear(year: number, countryCode: string) {
  const res = await fetch(`${BASE}/PublicHolidays/${year}/${countryCode}`, {
    next: { revalidate: 86_400 },
  });
  if (res.status === 404) return []; // unsupported country/year
  if (!res.ok) throw new Error(`Holiday API error (${res.status}).`);
  const parsed = z.array(nagerHoliday).safeParse(await res.json());
  return parsed.success ? parsed.data : [];
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export class HolidayApiProvider implements EventProvider {
  async sync(config: unknown): Promise<EventDelta> {
    const { countryCode } = holidayConfigSchema.parse(config);
    const thisYear = new Date().getFullYear();

    // Pull this year + next so upcoming January holidays are visible in December.
    const years = [thisYear, thisYear + 1];
    const upserts: NormalizedEvent[] = [];

    for (const year of years) {
      const holidays = await fetchYear(year, countryCode);
      for (const h of holidays) {
        const [y, m, d] = h.date.split("-").map(Number);
        upserts.push({
          externalId: `${h.countryCode}:${h.date}:${slug(h.name)}`,
          title: h.localName,
          month: m,
          day: d,
          year: y,
          recurringAnnually: false,
          raw: h,
        });
      }
    }

    // We don't compute deletions here; stale rows from prior years naturally
    // fall outside the scheduling horizon and are pruned on resync by year.
    return { upserts, deletedExternalIds: [] };
  }
}
