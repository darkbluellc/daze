import { prisma } from "@/lib/db";
import { HolidayApiProvider } from "@/lib/providers/events/holiday-api";
import { IcsProvider } from "@/lib/providers/events/ics";
import type { EventProvider } from "@/lib/providers/events/types";

export type EventSyncSummary = { created: number; updated: number; deleted: number };

function providerFor(type: string): EventProvider {
  switch (type) {
    case "HOLIDAY_API":
      return new HolidayApiProvider();
    case "ICS":
      return new IcsProvider();
    default:
      throw new Error(`Unsupported event source type: ${type}`);
  }
}

/** Pull events for a source, upsert them, and create default-off subscriptions. */
export async function syncEventSource(sourceId: string): Promise<EventSyncSummary> {
  const source = await prisma.eventSource.findUniqueOrThrow({
    where: { id: sourceId },
  });

  try {
    const provider = providerFor(source.type);
    const delta = await provider.sync(source.config);

    const summary: EventSyncSummary = { created: 0, updated: 0, deleted: 0 };

    for (const e of delta.upserts) {
      const existing = await prisma.event.findUnique({
        where: {
          eventSourceId_externalId: {
            eventSourceId: source.id,
            externalId: e.externalId,
          },
        },
        select: { id: true },
      });

      const event = await prisma.event.upsert({
        where: {
          eventSourceId_externalId: {
            eventSourceId: source.id,
            externalId: e.externalId,
          },
        },
        create: {
          userId: source.userId,
          eventSourceId: source.id,
          externalId: e.externalId,
          title: e.title,
          month: e.month,
          day: e.day,
          year: e.year ?? null,
          recurringAnnually: e.recurringAnnually,
          raw: e.raw as object,
        },
        update: {
          title: e.title,
          month: e.month,
          day: e.day,
          year: e.year ?? null,
          recurringAnnually: e.recurringAnnually,
          raw: e.raw as object,
        },
      });

      if (existing) summary.updated += 1;
      else summary.created += 1;

      const sub = await prisma.subscription.findUnique({
        where: { eventId: event.id },
        select: { id: true },
      });
      if (!sub) {
        await prisma.subscription.create({
          data: { userId: source.userId, eventId: event.id },
        });
      }
    }

    // Prune past dated events (last year and earlier) to keep the list tidy.
    const cutoffYear = new Date().getFullYear();
    const pruned = await prisma.event.deleteMany({
      where: {
        eventSourceId: source.id,
        recurringAnnually: false,
        year: { lt: cutoffYear },
      },
    });
    summary.deleted = pruned.count;

    await prisma.eventSource.update({
      where: { id: source.id },
      data: { lastSyncedAt: new Date(), status: "OK", lastError: null },
    });

    return summary;
  } catch (err) {
    await prisma.eventSource.update({
      where: { id: source.id },
      data: {
        status: "ERROR",
        lastError: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}
