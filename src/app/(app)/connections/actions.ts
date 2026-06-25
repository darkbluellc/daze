"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import {
  validateUserKey,
  sendPushover,
  PushoverNotConfiguredError,
} from "@/lib/pushover";
import { syncContactSource } from "@/lib/services/contact-sync";

export type ActionState = { ok?: boolean; error?: string; message?: string };

/** Validate the supplied Pushover key, then store it (encrypted) on the user. */
export async function connectPushoverAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const userKey = String(formData.get("userKey") ?? "").trim();
  const device = String(formData.get("device") ?? "").trim() || null;
  if (!userKey) return { error: "Enter your Pushover user key." };

  try {
    const result = await validateUserKey(userKey, device);
    if (!result.ok) return { error: result.error };

    await prisma.user.update({
      where: { id: user.id },
      data: {
        pushoverUserKey: encrypt(userKey),
        pushoverDevice: device,
        pushoverVerifiedAt: new Date(),
      },
    });
  } catch (e) {
    if (e instanceof PushoverNotConfiguredError) return { error: e.message };
    throw e;
  }

  revalidatePath("/connections");
  return { ok: true, message: "Pushover connected." };
}

export async function sendTestPushAction(): Promise<ActionState> {
  const user = await requireUser();
  if (!user.pushoverUserKey) return { error: "Connect Pushover first." };

  try {
    const result = await sendPushover({
      userKey: decrypt(user.pushoverUserKey),
      device: user.pushoverDevice,
      title: "Daze test notification",
      message: "🎉 Your Pushover connection is working.",
    });
    if (!result.ok) return { error: result.error };
  } catch (e) {
    if (e instanceof PushoverNotConfiguredError) return { error: e.message };
    throw e;
  }

  return { ok: true, message: "Test notification sent." };
}

export async function disconnectPushoverAction(): Promise<ActionState> {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      pushoverUserKey: null,
      pushoverDevice: null,
      pushoverVerifiedAt: null,
    },
  });
  revalidatePath("/connections");
  return { ok: true, message: "Pushover disconnected." };
}

// --- Google contacts --------------------------------------------------------

async function ownedSource(userId: string, sourceId: string) {
  const source = await prisma.contactSource.findUnique({
    where: { id: sourceId },
    select: { id: true, userId: true },
  });
  if (!source || source.userId !== userId) return null;
  return source;
}

export async function syncGoogleNowAction(
  sourceId: string,
): Promise<ActionState> {
  const user = await requireUser();
  if (!(await ownedSource(user.id, sourceId))) {
    return { error: "Source not found." };
  }

  try {
    const s = await syncContactSource(sourceId);
    revalidatePath("/birthdays");
    revalidatePath("/connections");
    return {
      ok: true,
      message: `Synced: ${s.created} new, ${s.updated} updated${
        s.newBirthdays ? `, ${s.newBirthdays} new birthday(s)` : ""
      }.`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sync failed." };
  }
}

export async function disconnectGoogleAction(
  sourceId: string,
): Promise<ActionState> {
  const user = await requireUser();
  if (!(await ownedSource(user.id, sourceId))) {
    return { error: "Source not found." };
  }
  // Cascades to contacts, subscriptions, and scheduled notifications.
  await prisma.contactSource.delete({ where: { id: sourceId } });
  revalidatePath("/birthdays");
  revalidatePath("/connections");
  return { ok: true, message: "Google account disconnected." };
}
