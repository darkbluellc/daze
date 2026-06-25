"use server";

import { revalidatePath } from "next/cache";
import { DateTime } from "luxon";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { sendPushover, PushoverNotConfiguredError } from "@/lib/pushover";
import {
  updateSubscriptionConfig,
  acknowledgeSubscription,
  quickEnableSubscription,
} from "@/lib/services/subscription";
import {
  subscriptionOccurrence,
  buildNotificationContent,
} from "@/lib/services/notification-content";
import type { SubscriptionConfigInput } from "@/lib/validation";

export type SaveResult = { ok: boolean; error?: string };

export async function saveSubscriptionConfigAction(
  subscriptionId: string,
  input: SubscriptionConfigInput,
): Promise<SaveResult> {
  const user = await requireUser();
  const res = await updateSubscriptionConfig(user.id, subscriptionId, input);
  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath("/birthdays");
  revalidatePath("/holidays");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function acknowledgeSubscriptionAction(
  subscriptionId: string,
): Promise<SaveResult> {
  const user = await requireUser();
  await acknowledgeSubscription(user.id, subscriptionId);
  revalidatePath("/birthdays");
  revalidatePath("/holidays");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** One-click enable with sensible defaults (day-of at the account default time). */
export async function quickEnableSubscriptionAction(
  subscriptionId: string,
): Promise<SaveResult> {
  const user = await requireUser();
  const res = await quickEnableSubscription(user.id, subscriptionId);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/birthdays");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Send a one-off test notification for a single item via Pushover. */
export async function sendTestForSubscriptionAction(
  subscriptionId: string,
): Promise<SaveResult> {
  const user = await requireUser();
  if (!user.pushoverUserKey) return { ok: false, error: "Connect Pushover first." };

  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { contact: true, event: true },
  });
  if (!sub || sub.userId !== user.id) return { ok: false, error: "Not found." };

  const tz = user.timezone;
  const occ = subscriptionOccurrence(sub, tz, DateTime.now().setZone(tz));
  if (!occ) return { ok: false, error: "Nothing upcoming to preview." };

  const content = buildNotificationContent(sub, occ, null);
  try {
    const res = await sendPushover({
      userKey: decrypt(user.pushoverUserKey),
      device: user.pushoverDevice,
      title: `[Test] ${content.title}`,
      message: content.body,
      url: content.url,
      urlTitle: "Open in Daze",
    });
    if (!res.ok) return { ok: false, error: res.error };
  } catch (e) {
    if (e instanceof PushoverNotConfiguredError) return { ok: false, error: e.message };
    throw e;
  }
  return { ok: true };
}
