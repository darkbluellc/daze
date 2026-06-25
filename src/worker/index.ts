// Daze worker: pg-boss schedules + handlers.
//   • dispatch    — every minute: send due notifications
//   • sync        — every 6 hours: refresh sources, then materialize
//   • materialize — daily: roll the scheduling horizon forward
//
// pg-boss stores its own state in the `pgboss` schema of the same Postgres.

import "dotenv/config";
import { PgBoss } from "pg-boss";

import { env } from "@/lib/env";
import { runDispatch } from "@/lib/jobs/dispatch";
import { runSyncAll, runMaterializeAll } from "@/lib/jobs/sync";

const QUEUES = ["dispatch", "sync", "materialize"] as const;

async function main() {
  console.log(`[daze:worker] starting${env.dryRun ? " (DRY RUN)" : ""}…`);

  const boss = new PgBoss({ connectionString: env.databaseUrl });
  boss.on("error", (err: unknown) =>
    console.error("[daze:worker] pg-boss error:", err),
  );

  await boss.start();
  for (const q of QUEUES) await boss.createQueue(q);

  await boss.work("dispatch", async () => {
    const r = await runDispatch();
    if (r.processed) console.log("[daze:dispatch]", r);
  });
  await boss.work("sync", async () => {
    console.log("[daze:sync]", await runSyncAll());
  });
  await boss.work("materialize", async () => {
    console.log("[daze:materialize]", await runMaterializeAll());
  });

  // Cron schedules are evaluated in UTC. scheduledFor is an absolute instant,
  // so a per-minute dispatch fires at the right wall-clock time in any tz.
  await boss.schedule("dispatch", "* * * * *");
  await boss.schedule("sync", "0 */6 * * *");
  await boss.schedule("materialize", "0 6 * * *");

  // Prime the schedule on boot so newly enabled items don't wait for a tick.
  await runMaterializeAll().catch((e) =>
    console.error("[daze:worker] initial materialize failed:", e),
  );

  console.log("[daze:worker] ready.");

  const shutdown = async (signal: string) => {
    console.log(`[daze:worker] ${signal} received, stopping…`);
    await boss.stop().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[daze:worker] fatal:", err);
  process.exit(1);
});
