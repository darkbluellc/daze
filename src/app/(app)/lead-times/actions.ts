"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { leadTimeSchema } from "@/lib/validation";

export type ActionState = { ok?: boolean; error?: string; message?: string };

export async function createLeadTimeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = leadTimeSchema.safeParse({
    label: formData.get("label"),
    value: formData.get("value"),
    unit: formData.get("unit"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await prisma.leadTime.create({
      data: { userId: user.id, ...parsed.data },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "You already have a lead time with that label." };
    }
    throw e;
  }

  revalidatePath("/lead-times");
  return { ok: true, message: "Lead time added." };
}

export async function deleteLeadTimeAction(id: string): Promise<ActionState> {
  const user = await requireUser();
  // Deleting cascades to SubscriptionLeadTime links (the option disappears
  // from any items that used it).
  await prisma.leadTime.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/lead-times");
  return { ok: true, message: "Lead time removed." };
}
