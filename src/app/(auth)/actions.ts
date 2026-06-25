"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { isRegistrationAllowed } from "@/lib/env";
import { loginSchema, registerSchema } from "@/lib/validation";

export type AuthFormState = { error?: string } | undefined;

const DEFAULT_LEAD_TIMES: Array<{
  label: string;
  value: number;
  unit: "DAY" | "WEEK" | "MONTH";
}> = [
  { label: "1 day before", value: 1, unit: "DAY" },
  { label: "2 days before", value: 2, unit: "DAY" },
  { label: "1 week before", value: 1, unit: "WEEK" },
  { label: "1 month before", value: 1, unit: "MONTH" },
];

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, email, password } = parsed.data;

  if (!isRegistrationAllowed(email)) {
    return { error: "This email is not allowed to register on this instance." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      // Give every new account a useful default menu of lead times.
      leadTimes: { create: DEFAULT_LEAD_TIMES },
    },
  });

  // Sign the user in immediately; throws a redirect on success.
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard",
  });
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter your email and password." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error; // re-throw redirect
  }
}
