import { DateTime } from "luxon";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { occurrenceInYear, nextOccurrence, describeUntil } from "@/lib/dates";
import { listLeadTimes } from "@/lib/services/lead-times";
import { fetchAvailableCountries } from "@/lib/providers/events/holiday-api";
import { PageHeader } from "@/components/page-header";
import { AddHolidaySource, type Country } from "@/components/holidays/add-holiday-source";
import { AddIcsSource } from "@/components/holidays/add-ics-source";
import {
  HolidaySources,
  type HolidaySourceCard,
} from "@/components/holidays/holiday-sources";

export default async function HolidaysPage() {
  const user = await requireUser();
  const tz = user.timezone;
  const now = DateTime.now().setZone(tz);
  const today = now.startOf("day");

  const [sources, leadTimes, countries] = await Promise.all([
    prisma.eventSource.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: {
        events: {
          include: { subscription: { include: { leadTimes: true } } },
        },
      },
    }),
    listLeadTimes(user.id),
    fetchAvailableCountries().catch(() => [] as Country[]),
  ]);

  const sourceCards: HolidaySourceCard[] = sources.map((src) => {
    const events = src.events
      .map((e) => {
        const occ =
          e.recurringAnnually || e.year == null
            ? nextOccurrence(e.month, e.day, tz, now)
            : occurrenceInYear(e.year, e.month, e.day, tz);
        return { e, occ };
      })
      .filter(({ occ }) => occ >= today)
      .sort((a, b) => a.occ.toMillis() - b.occ.toMillis())
      .map(({ e, occ }) => {
        const sub = e.subscription;
        return {
          title: e.title,
          occLabel: `${occ.toFormat("EEE, MMM d")} · ${describeUntil(occ, now)}`,
          config: {
            id: sub?.id ?? "",
            enabled: sub?.enabled ?? false,
            sendDayOf: sub?.sendDayOf ?? true,
            dayOfTimeOverride: sub?.dayOfTimeOverride ?? null,
            selectedLeadTimeIds: sub?.leadTimes.map((l) => l.leadTimeId) ?? [],
          },
        };
      });
    return {
      id: src.id,
      name: src.name,
      lastSyncedAt: src.lastSyncedAt?.toISOString() ?? null,
      events,
    };
  });

  return (
    <>
      <PageHeader
        title="Holidays"
        description="Subscribe to public holidays and choose which to be reminded about."
      />
      <div className="grid gap-6">
        <div className="grid gap-6 md:grid-cols-2">
          <AddHolidaySource countries={countries} />
          <AddIcsSource />
        </div>
        {sourceCards.length > 0 && (
          <HolidaySources
            sources={sourceCards}
            leadTimes={leadTimes.map((lt) => ({ id: lt.id, label: lt.label }))}
            defaultNotifyTime={user.defaultNotifyTime}
            canSendTest={Boolean(user.pushoverUserKey)}
          />
        )}
      </div>
    </>
  );
}
