import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/** Current DB user, or null if unauthenticated. Use in server components. */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

/** Like getCurrentUser but redirects to /login when not signed in. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
