import { DateTime } from "luxon";
import { Cake } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { nextOccurrence, ageOnOccurrence, describeUntil } from "@/lib/dates";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/button-link";
import { Card, CardContent } from "@/components/ui/card";
import { BirthdaysList } from "@/components/birthdays/birthdays-list";
import { ReviewBirthdaysButton } from "@/components/onboarding/review-birthdays-button";

export default async function BirthdaysPage() {
  const user = await requireUser();
  const tz = user.timezone;
  const now = DateTime.now().setZone(tz);

  const [contacts, leadTimes] = await Promise.all([
    prisma.contact.findMany({
      where: { userId: user.id },
      include: {
        subscription: { include: { leadTimes: true } },
      },
    }),
    prisma.leadTime.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const rows = contacts
    .filter((c) => c.subscription)
    .map((c) => {
      const sub = c.subscription!;
      const occ = nextOccurrence(c.birthdayMonth, c.birthdayDay, tz, now);
      const age = ageOnOccurrence(c.birthdayYear, occ);
      return {
        occMillis: occ.toMillis(),
        name: c.displayName,
        occLabel: `${occ.toFormat("MMMM d")}${
          age !== null ? ` · turns ${age}` : ""
        } · ${describeUntil(occ, now)}`,
        config: {
          id: sub.id,
          enabled: sub.enabled,
          sendDayOf: sub.sendDayOf,
          dayOfTimeOverride: sub.dayOfTimeOverride,
          selectedLeadTimeIds: sub.leadTimes.map((l) => l.leadTimeId),
          notes: c.notes,
        },
      };
    })
    .sort((a, b) => a.occMillis - b.occMillis);

  const unreviewedCount = contacts.filter(
    (c) => c.subscription && c.subscription.acknowledgedAt === null,
  ).length;

  return (
    <>
      <PageHeader
        title="Birthdays"
        description="Configure reminders for your contacts' birthdays."
        action={
          rows.length > 0 ? (
            <ReviewBirthdaysButton count={unreviewedCount} />
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Cake className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No birthdays yet. Connect Google Contacts to import them.
            </p>
            <ButtonLink href="/connections">Go to connections</ButtonLink>
          </CardContent>
        </Card>
      ) : (
        <BirthdaysList
          rows={rows}
          leadTimes={leadTimes.map((lt) => ({ id: lt.id, label: lt.label }))}
          defaultNotifyTime={user.defaultNotifyTime}
          canSendTest={Boolean(user.pushoverUserKey)}
        />
      )}
    </>
  );
}
