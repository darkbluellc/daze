import { DateTime } from "luxon";
import { CalendarClock } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function groupLabel(date: DateTime, today: DateTime): string {
  const days = Math.round(date.startOf("day").diff(today, "days").days);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return date.toFormat("EEEE, MMM d");
}

export default async function UpcomingPage() {
  const user = await requireUser();
  const tz = user.timezone;
  const today = DateTime.now().setZone(tz).startOf("day");

  const pending = await prisma.scheduledNotification.findMany({
    where: { userId: user.id, status: "PENDING" },
    orderBy: { scheduledFor: "asc" },
    take: 100,
  });

  // Group by local calendar day.
  const groups = new Map<
    string,
    { date: DateTime; items: typeof pending }
  >();
  for (const n of pending) {
    const dt = DateTime.fromJSDate(n.scheduledFor).setZone(tz);
    const key = dt.toISODate()!;
    if (!groups.has(key)) groups.set(key, { date: dt.startOf("day"), items: [] });
    groups.get(key)!.items.push(n);
  }
  const orderedGroups = [...groups.values()].sort(
    (a, b) => a.date.toMillis() - b.date.toMillis(),
  );

  return (
    <>
      <PageHeader
        title="Upcoming"
        description="Every reminder Daze is about to send, grouped by day."
      />

      {orderedGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CalendarClock className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No reminders scheduled. Enable some on a birthday or holiday.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {orderedGroups.map((group) => (
            <section key={group.date.toISODate()}>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="font-heading text-sm font-bold tracking-tight">
                  {groupLabel(group.date, today)}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {group.items.length} reminder{group.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <Card>
                <CardContent className="divide-y p-0">
                  {group.items.map((n) => {
                    const time = DateTime.fromJSDate(n.scheduledFor)
                      .setZone(tz)
                      .toFormat("h:mm a");
                    return (
                      <div key={n.id} className="flex items-start gap-4 px-5 py-3">
                        <div className="w-20 shrink-0 pt-0.5 text-sm font-medium tabular-nums text-muted-foreground">
                          {time}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{n.title}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {n.body}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {n.leadTimeId ? "ahead" : "day-of"}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
