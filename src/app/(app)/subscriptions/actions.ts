"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import {
  updateSubscriptionConfig,
  acknowledgeSubscription,
} from "@/lib/services/subscription";
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
