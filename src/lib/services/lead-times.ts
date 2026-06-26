import type { LeadTime } from "@prisma/client";

import { prisma } from "@/lib/db";
import { leadTimeToDays } from "@/lib/dates";

/** A user's lead times, sorted by ascending duration (1 day → 1 week → 1 month). */
export async function listLeadTimes(userId: string): Promise<LeadTime[]> {
  const rows = await prisma.leadTime.findMany({ where: { userId } });
  return rows.sort(
    (a, b) => leadTimeToDays(a.value, a.unit) - leadTimeToDays(b.value, b.unit),
  );
}
