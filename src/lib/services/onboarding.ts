import { DateTime } from "luxon";

import { prisma } from "@/lib/db";
import { nextOccurrence, ageOnOccurrence, describeUntil } from "@/lib/dates";

// "Unreviewed" = a birthday whose subscription the user hasn't acknowledged yet
// (default-off until they decide). Surfaced by the onboarding/review prompt.

export type UnreviewedBirthday = {
  subscriptionId: string;
  name: string;
  occLabel: string;
};

export async function getUnreviewedBirthdays(
  userId: string,
): Promise<UnreviewedBirthday[]> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true },
  });
  const tz = user.timezone;
  const now = DateTime.now().setZone(tz);

  const subs = await prisma.subscription.findMany({
    where: { userId, acknowledgedAt: null, contactId: { not: null } },
    include: { contact: true },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return subs
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
}

export function countUnreviewedBirthdays(userId: string): Promise<number> {
  return prisma.subscription.count({
    where: { userId, acknowledgedAt: null, contactId: { not: null } },
  });
}
