import { DateTime } from "luxon";
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock,
  Contact2,
  XCircle,
} from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/button-link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        {hint && <span className="ml-auto text-xs text-muted-foreground">{hint}</span>}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const tz = user.timezone;

  const [enabledCount, contactSources, upcoming, recent] = await Promise.all([
    prisma.subscription.count({ where: { userId: user.id, enabled: true } }),
    prisma.contactSource.count({ where: { userId: user.id } }),
    prisma.scheduledNotification.findMany({
      where: { userId: user.id, status: "PENDING" },
      orderBy: { scheduledFor: "asc" },
      take: 12,
    }),
    prisma.scheduledNotification.findMany({
      where: { userId: user.id, status: { in: ["SENT", "FAILED", "SKIPPED"] } },
      orderBy: { sentAt: "desc" },
      take: 8,
    }),
  ]);

  const pushoverReady = Boolean(user.pushoverUserKey);
  const fmt = (d: Date) =>
    DateTime.fromJSDate(d).setZone(tz).toFormat("EEE, MMM d · h:mm a");

  return (
    <>
      <PageHeader
        title={`Welcome${user.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description="Your upcoming birthday and holiday reminders."
      />

      {/* Setup nudges */}
      {(!pushoverReady || contactSources === 0) && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm">
              {!pushoverReady && contactSources === 0
                ? "Connect Pushover and Google Contacts to start receiving reminders."
                : !pushoverReady
                  ? "Connect Pushover so reminders can be delivered."
                  : "Connect Google Contacts to import birthdays."}
            </p>
            <ButtonLink size="sm" href="/connections">
              Go to connections
            </ButtonLink>
          </CardContent>
        </Card>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={CalendarClock}
          label="Reminders enabled"
          value={String(enabledCount)}
        />
        <StatCard
          icon={BellRing}
          label="Pushover"
          value={pushoverReady ? "Connected" : "Off"}
        />
        <StatCard
          icon={Contact2}
          label="Contact sources"
          value={String(contactSources)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {upcoming.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                Nothing scheduled yet. Enable reminders on a birthday or holiday.
              </p>
            ) : (
              <ul className="divide-y">
                {upcoming.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 px-6 py-3">
                    <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-muted">
                      <Clock className="size-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {n.body}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium">{fmt(n.scheduledFor)}</p>
                      <Badge variant="outline" className="mt-1">
                        {n.leadTimeId ? "ahead" : "day-of"}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                No notifications have been sent yet.
              </p>
            ) : (
              <ul className="divide-y">
                {recent.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 px-6 py-3">
                    <span className="mt-0.5">
                      {n.status === "SENT" ? (
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      ) : (
                        <XCircle className="size-4 text-destructive" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {n.status === "SENT"
                          ? "Sent"
                          : n.status === "SKIPPED"
                            ? `Skipped — ${n.error ?? ""}`
                            : `Failed — ${n.error ?? ""}`}
                      </p>
                    </div>
                    {n.sentAt && (
                      <p className="shrink-0 text-xs text-muted-foreground">
                        {fmt(n.sentAt)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
