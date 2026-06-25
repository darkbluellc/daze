import Link from "next/link";
import { DateTime } from "luxon";
import { Gift } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { nextOccurrence, ageOnOccurrence, describeUntil } from "@/lib/dates";
import { Nav } from "@/components/nav";
import { UserMenu } from "@/components/user-menu";
import {
  OnboardingPrompt,
  type OnboardingItem,
} from "@/components/onboarding/onboarding-prompt";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const tz = user.timezone;
  const now = DateTime.now().setZone(tz);

  // New, unconfigured birthdays to surface in the onboarding prompt.
  const [unconfigured, leadTimes] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId: user.id, acknowledgedAt: null, contactId: { not: null } },
      include: { contact: true },
      take: 25,
    }),
    prisma.leadTime.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const onboardingItems: OnboardingItem[] = unconfigured
    .filter((s) => s.contact)
    .map((s) => {
      const c = s.contact!;
      const occ = nextOccurrence(c.birthdayMonth, c.birthdayDay, tz, now);
      const age = ageOnOccurrence(c.birthdayYear, occ);
      return {
        subscriptionId: s.id,
        name: c.displayName,
        occLabel: `${occ.toFormat("MMMM d")}${
          age !== null ? ` · turns ${age}` : ""
        } · ${describeUntil(occ, now)}`,
      };
    });

  return (
    <div className="flex min-h-screen flex-1">
      <OnboardingPrompt
        items={onboardingItems}
        leadTimes={leadTimes.map((lt) => ({ id: lt.id, label: lt.label }))}
        defaultNotifyTime={user.defaultNotifyTime}
      />
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card/40 md:flex">
        <div className="flex h-16 items-center gap-2 px-6 font-heading text-lg font-bold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <Gift className="size-4" />
          </span>
          Daze
        </div>
        <div className="flex-1 px-3 py-2">
          <Nav className="flex-col" />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b px-4 md:px-8">
          <Link href="/dashboard" className="flex items-center gap-2 font-heading font-bold tracking-tight md:hidden">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Gift className="size-4" />
            </span>
            Daze
          </Link>
          <div className="ml-auto">
            <UserMenu name={user.name ?? user.email} email={user.email} />
          </div>
        </header>

        {/* Mobile nav */}
        <div className="overflow-x-auto border-b px-2 py-2 md:hidden">
          <Nav className="w-max" />
        </div>

        <main className="flex-1 px-4 py-8 md:px-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
