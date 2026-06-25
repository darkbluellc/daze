import { describe, it, expect, vi } from "vitest";

// Mock node-ical's async.fromURL so the test is hermetic (no network).
vi.mock("node-ical", () => ({
  default: { async: { fromURL: vi.fn() } },
}));

import ical from "node-ical";
import { IcsProvider } from "./ics";

const fromURL = ical.async.fromURL as unknown as ReturnType<typeof vi.fn>;

describe("IcsProvider", () => {
  it("maps yearly-recurring and one-off VEVENTs", async () => {
    fromURL.mockResolvedValue({
      a: {
        type: "VEVENT",
        uid: "birthday-jane",
        summary: "Jane's birthday",
        start: new Date(Date.UTC(1990, 2, 14)), // Mar 14
        datetype: "date",
        rrule: { options: { freq: 0 } }, // YEARLY
      },
      b: {
        type: "VEVENT",
        uid: "offsite-2026",
        summary: "Team offsite",
        start: new Date(Date.UTC(2026, 8, 9)), // Sep 9 2026
        datetype: "date",
      },
      c: { type: "VTIMEZONE" }, // ignored
    });

    const delta = await new IcsProvider().sync({ url: "https://x.test/cal.ics" });

    expect(delta.upserts).toHaveLength(2);

    const recurring = delta.upserts.find((e) => e.title === "Jane's birthday")!;
    expect(recurring.recurringAnnually).toBe(true);
    expect(recurring.year).toBeNull();
    expect(recurring.month).toBe(3);
    expect(recurring.day).toBe(14);
    expect(recurring.externalId).toBe("birthday-jane");

    const oneOff = delta.upserts.find((e) => e.title === "Team offsite")!;
    expect(oneOff.recurringAnnually).toBe(false);
    expect(oneOff.year).toBe(2026);
    expect(oneOff.month).toBe(9);
    expect(oneOff.day).toBe(9);
    expect(oneOff.externalId).toBe("offsite-2026:2026");
  });

  it("rejects an invalid URL", async () => {
    await expect(new IcsProvider().sync({ url: "not-a-url" })).rejects.toThrow();
  });
});
