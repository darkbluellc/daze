import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";

import {
  clampDay,
  occurrenceInYear,
  nextOccurrence,
  ageOnOccurrence,
  subtractLeadTime,
  atLocalTime,
  formatLeadTime,
} from "./dates";

const TZ = "America/New_York";
// A fixed "now" for deterministic tests: 24 Jun 2026, 10:00 local.
const NOW = DateTime.fromObject(
  { year: 2026, month: 6, day: 24, hour: 10 },
  { zone: TZ },
);

describe("clampDay", () => {
  it("clamps Feb 29 to 28 in a non-leap year", () => {
    expect(clampDay(2027, 2, 29)).toBe(28);
  });
  it("keeps Feb 29 in a leap year", () => {
    expect(clampDay(2028, 2, 29)).toBe(29);
  });
  it("leaves normal days untouched", () => {
    expect(clampDay(2026, 6, 25)).toBe(25);
  });
});

describe("nextOccurrence", () => {
  it("returns this year when the date is still ahead", () => {
    const occ = nextOccurrence(6, 25, TZ, NOW);
    expect(occ.toISODate()).toBe("2026-06-25");
  });

  it("counts today as the next occurrence", () => {
    const occ = nextOccurrence(6, 24, TZ, NOW);
    expect(occ.toISODate()).toBe("2026-06-24");
  });

  it("rolls into next year when the date has passed", () => {
    const occ = nextOccurrence(1, 1, TZ, NOW);
    expect(occ.toISODate()).toBe("2027-01-01");
  });

  it("resolves Feb 29 to Feb 28 in a non-leap target year", () => {
    const occ = nextOccurrence(2, 29, TZ, NOW);
    expect(occ.toISODate()).toBe("2027-02-28");
  });

  it("keeps Feb 29 in a leap target year", () => {
    const occ = occurrenceInYear(2028, 2, 29, TZ);
    expect(occ.toISODate()).toBe("2028-02-29");
  });
});

describe("ageOnOccurrence", () => {
  it("computes age from birth year", () => {
    const occ = nextOccurrence(6, 25, TZ, NOW);
    expect(ageOnOccurrence(1990, occ)).toBe(36);
  });
  it("returns null without a birth year", () => {
    const occ = nextOccurrence(6, 25, TZ, NOW);
    expect(ageOnOccurrence(null, occ)).toBeNull();
  });
});

describe("subtractLeadTime", () => {
  const base = occurrenceInYear(2026, 6, 25, TZ);
  it("subtracts days/weeks/months", () => {
    expect(subtractLeadTime(base, 1, "DAY").toISODate()).toBe("2026-06-24");
    expect(subtractLeadTime(base, 1, "WEEK").toISODate()).toBe("2026-06-18");
    expect(subtractLeadTime(base, 1, "MONTH").toISODate()).toBe("2026-05-25");
  });
});

describe("atLocalTime", () => {
  it("converts a local 09:00 send time to the correct UTC instant (EDT)", () => {
    const occ = occurrenceInYear(2026, 6, 25, TZ);
    const at = atLocalTime(occ, "09:00", TZ);
    // 09:00 EDT == 13:00 UTC
    expect(at.toUTC().hour).toBe(13);
    expect(at.toUTC().toISO()).toBe("2026-06-25T13:00:00.000Z");
  });
});

describe("formatLeadTime", () => {
  it("pluralizes", () => {
    expect(formatLeadTime(1, "DAY")).toBe("1 day");
    expect(formatLeadTime(2, "WEEK")).toBe("2 weeks");
  });
});
