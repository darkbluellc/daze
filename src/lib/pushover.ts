import { env } from "@/lib/env";

// Thin client over the Pushover HTTP API.
// One shared application token (env) + a per-user recipient key.

const VALIDATE_URL = "https://api.pushover.net/1/users/validate.json";
const MESSAGES_URL = "https://api.pushover.net/1/messages.json";

export class PushoverNotConfiguredError extends Error {
  constructor() {
    super("Pushover is not configured on this instance (missing app token).");
    this.name = "PushoverNotConfiguredError";
  }
}

function appToken(): string {
  if (!env.pushoverAppToken) throw new PushoverNotConfiguredError();
  return env.pushoverAppToken;
}

type PushoverApiResponse = {
  status: number;
  request?: string;
  receipt?: string;
  errors?: string[];
  devices?: string[];
};

export type ValidateResult =
  | { ok: true; devices: string[] }
  | { ok: false; error: string };

/** Validate a user/group key (and optional device) against Pushover. */
export async function validateUserKey(
  userKey: string,
  device?: string | null,
): Promise<ValidateResult> {
  const body = new URLSearchParams({ token: appToken(), user: userKey });
  if (device) body.set("device", device);

  let data: PushoverApiResponse;
  try {
    const res = await fetch(VALIDATE_URL, { method: "POST", body });
    data = (await res.json()) as PushoverApiResponse;
  } catch {
    return { ok: false, error: "Could not reach Pushover. Try again." };
  }

  if (data.status === 1) return { ok: true, devices: data.devices ?? [] };
  return { ok: false, error: data.errors?.join(", ") ?? "Invalid Pushover key." };
}

export type SendResult =
  | { ok: true; receipt?: string; request?: string }
  | { ok: false; error: string };

export type PushoverMessage = {
  userKey: string;
  device?: string | null;
  title: string;
  message: string;
  url?: string;
  urlTitle?: string;
  priority?: number;
  timestamp?: number; // unix seconds
};

/** Send a push. Returns a structured result rather than throwing on API errors. */
export async function sendPushover(msg: PushoverMessage): Promise<SendResult> {
  const body = new URLSearchParams({
    token: appToken(),
    user: msg.userKey,
    title: msg.title,
    message: msg.message,
  });
  if (msg.device) body.set("device", msg.device);
  if (msg.url) body.set("url", msg.url);
  if (msg.urlTitle) body.set("url_title", msg.urlTitle);
  if (msg.priority !== undefined) body.set("priority", String(msg.priority));
  if (msg.timestamp !== undefined) body.set("timestamp", String(msg.timestamp));

  let data: PushoverApiResponse;
  try {
    const res = await fetch(MESSAGES_URL, { method: "POST", body });
    data = (await res.json()) as PushoverApiResponse;
  } catch {
    return { ok: false, error: "Could not reach Pushover." };
  }

  if (data.status === 1) return { ok: true, receipt: data.receipt, request: data.request };
  return { ok: false, error: data.errors?.join(", ") ?? "Pushover rejected the message." };
}
