import { z } from "zod";

// Shared input schemas (used by server actions and API routes).

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: emailSchema,
  password: passwordSchema,
});

// HH:mm 24-hour
export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm format");

export const accountSettingsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  timezone: z.string().min(1, "Pick a timezone"),
  defaultNotifyTime: timeSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export const leadTimeSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(40),
  value: z.coerce.number().int().min(1, "Must be at least 1").max(365),
  unit: z.enum(["DAY", "WEEK", "MONTH"]),
});

export const subscriptionConfigSchema = z.object({
  enabled: z.boolean(),
  sendDayOf: z.boolean(),
  // Empty string => use the account default notify time.
  dayOfTimeOverride: z.union([timeSchema, z.literal("")]).optional(),
  leadTimeIds: z.array(z.string()).default([]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SubscriptionConfigInput = z.infer<typeof subscriptionConfigSchema>;
