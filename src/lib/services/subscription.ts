import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { materializeUser } from "@/lib/services/materialize";
import {
  subscriptionConfigSchema,
  type SubscriptionConfigInput,
} from "@/lib/validation";

/** Update a subscription's notification config and re-materialize the schedule. */
export async function updateSubscriptionConfig(
  userId: string,
  subscriptionId: string,
  rawInput: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = subscriptionConfigSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input: SubscriptionConfigInput = parsed.data;

  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true, userId: true, contactId: true },
  });
  if (!sub || sub.userId !== userId) {
    return { ok: false, error: "Subscription not found." };
  }

  // Only allow lead times the user actually owns.
  const ownedLeadTimes = await prisma.leadTime.findMany({
    where: { userId, id: { in: input.leadTimeIds } },
    select: { id: true },
  });
  const leadTimeIds = ownedLeadTimes.map((lt) => lt.id);

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        enabled: input.enabled,
        sendDayOf: input.sendDayOf,
        dayOfTimeOverride: input.dayOfTimeOverride || null,
        acknowledgedAt: new Date(),
      },
    }),
    prisma.subscriptionLeadTime.deleteMany({ where: { subscriptionId } }),
    prisma.subscriptionLeadTime.createMany({
      data: leadTimeIds.map((leadTimeId) => ({ subscriptionId, leadTimeId })),
    }),
  ];

  // Notes live on the contact, not the subscription.
  if (input.notes !== undefined && sub.contactId) {
    ops.push(
      prisma.contact.update({
        where: { id: sub.contactId },
        data: { notes: input.notes.trim() || null },
      }),
    );
  }

  await prisma.$transaction(ops);

  await materializeUser(userId);
  return { ok: true };
}

/**
 * One-click enable with sensible defaults: day-of reminder at the account's
 * default notify time. The item stays off until this is explicitly called.
 */
export async function quickEnableSubscription(
  userId: string,
  subscriptionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true, userId: true },
  });
  if (!sub || sub.userId !== userId) {
    return { ok: false, error: "Subscription not found." };
  }

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { enabled: true, sendDayOf: true, acknowledgedAt: new Date() },
  });
  await materializeUser(userId);
  return { ok: true };
}

/** Mark a subscription seen without enabling it (the "leave off" path). */
export async function acknowledgeSubscription(
  userId: string,
  subscriptionId: string,
): Promise<{ ok: boolean }> {
  await prisma.subscription.updateMany({
    where: { id: subscriptionId, userId },
    data: { acknowledgedAt: new Date() },
  });
  return { ok: true };
}
