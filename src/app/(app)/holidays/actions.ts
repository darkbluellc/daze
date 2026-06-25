"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { syncEventSource } from "@/lib/services/event-sync";
import { holidayConfigSchema } from "@/lib/providers/events/holiday-api";
import { icsConfigSchema } from "@/lib/providers/events/ics";

export type ActionState = { ok?: boolean; error?: string; message?: string };

export async function addHolidaySourceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const countryCode = String(formData.get("countryCode") ?? "").toUpperCase();
  const countryName = String(formData.get("countryName") ?? "").trim();
  const parsed = holidayConfigSchema.safeParse({ countryCode });
  if (!parsed.success) return { error: "Pick a country." };

  // Avoid duplicate holiday sources for the same country.
  const existing = await prisma.eventSource.findFirst({
    where: { userId: user.id, type: "HOLIDAY_API" },
  });
  const dup = await prisma.eventSource.findFirst({
    where: {
      userId: user.id,
      type: "HOLIDAY_API",
      config: { equals: { countryCode } },
    },
  });
  void existing;
  if (dup) return { error: "You already added holidays for that country." };

  const source = await prisma.eventSource.create({
    data: {
      userId: user.id,
      type: "HOLIDAY_API",
      name: countryName ? `${countryName} holidays` : `${countryCode} holidays`,
      config: { countryCode },
    },
  });

  try {
    await syncEventSource(source.id);
  } catch (e) {
    return {
      ok: true,
      message: "Source added, but the initial sync failed. Try Sync now.",
      error: e instanceof Error ? e.message : undefined,
    };
  }

  revalidatePath("/holidays");
  return { ok: true, message: "Holidays added." };
}

export async function addIcsSourceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const url = String(formData.get("url") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const parsed = icsConfigSchema.safeParse({ url });
  if (!parsed.success) return { error: "Enter a valid ICS calendar URL." };

  const source = await prisma.eventSource.create({
    data: {
      userId: user.id,
      type: "ICS",
      name: name || "Calendar",
      config: { url },
    },
  });

  try {
    await syncEventSource(source.id);
  } catch (e) {
    return {
      ok: true,
      message: "Calendar added, but the initial sync failed. Try Sync now.",
      error: e instanceof Error ? e.message : undefined,
    };
  }

  revalidatePath("/holidays");
  return { ok: true, message: "Calendar added." };
}

export async function syncEventSourceNowAction(
  sourceId: string,
): Promise<ActionState> {
  const user = await requireUser();
  const source = await prisma.eventSource.findFirst({
    where: { id: sourceId, userId: user.id },
    select: { id: true },
  });
  if (!source) return { error: "Source not found." };

  try {
    const s = await syncEventSource(sourceId);
    revalidatePath("/holidays");
    return { ok: true, message: `Synced ${s.created + s.updated} holidays.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sync failed." };
  }
}

export async function removeEventSourceAction(
  sourceId: string,
): Promise<ActionState> {
  const user = await requireUser();
  await prisma.eventSource.deleteMany({ where: { id: sourceId, userId: user.id } });
  revalidatePath("/holidays");
  return { ok: true, message: "Holiday source removed." };
}
