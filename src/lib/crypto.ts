import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

// AES-256-GCM encryption for secrets at rest (OAuth tokens, Pushover keys).
// Storage format: base64( iv(12) | authTag(16) | ciphertext ).

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const hex = process.env.DAZE_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error("DAZE_ENCRYPTION_KEY is not set");
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("DAZE_ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

// Convenience helpers for nullable DB columns.
export function encryptNullable(value: string | null | undefined): string | null {
  return value ? encrypt(value) : null;
}

export function decryptNullable(value: string | null | undefined): string | null {
  return value ? decrypt(value) : null;
}
