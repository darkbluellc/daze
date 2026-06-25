import { prisma } from "@/lib/db";
import { syncContactSource } from "@/lib/services/contact-sync";
import { syncEventSource } from "@/lib/services/event-sync";
import { materializeUser } from "@/lib/services/materialize";

/** Sync every connected source. Per-source failures are logged, not fatal. */
export async function runSyncAll(): Promise<{ contacts: number; events: number }> {
  const [contactSources, eventSources] = await Promise.all([
    prisma.contactSource.findMany({
      where: { status: { not: "DISCONNECTED" } },
      select: { id: true },
    }),
    prisma.eventSource.findMany({ where: { enabled: true }, select: { id: true } }),
  ]);

  for (const s of contactSources) {
    try {
      await syncContactSource(s.id);
    } catch (err) {
      console.error(`[daze:sync] contact source ${s.id} failed:`, err);
    }
  }

  for (const s of eventSources) {
    try {
      await syncEventSource(s.id);
    } catch (err) {
      console.error(`[daze:sync] event source ${s.id} failed:`, err);
    }
  }

  await runMaterializeAll();
  return { contacts: contactSources.length, events: eventSources.length };
}

/** Roll the schedule horizon forward for every user. */
export async function runMaterializeAll(): Promise<{ users: number }> {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const u of users) {
    try {
      await materializeUser(u.id);
    } catch (err) {
      console.error(`[daze:materialize] user ${u.id} failed:`, err);
    }
  }
  return { users: users.length };
}
