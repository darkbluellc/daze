import { describe, it, expect } from "vitest";

import { encrypt, decrypt, encryptNullable, decryptNullable } from "./crypto";

describe("crypto (AES-256-GCM)", () => {
  it("round-trips a value", () => {
    const secret = "u-pushover-key-12345";
    expect(decrypt(encrypt(secret))).toBe(secret);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const a = encrypt("same");
    const b = encrypt("same");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("same");
    expect(decrypt(b)).toBe("same");
  });

  it("fails to decrypt tampered ciphertext", () => {
    const enc = encrypt("secret");
    const tampered = Buffer.from(enc, "base64");
    tampered[tampered.length - 1] ^= 0xff; // flip a ciphertext bit
    expect(() => decrypt(tampered.toString("base64"))).toThrow();
  });

  it("handles nullable helpers", () => {
    expect(encryptNullable(null)).toBeNull();
    expect(decryptNullable(null)).toBeNull();
    const enc = encryptNullable("x");
    expect(decryptNullable(enc)).toBe("x");
  });
});
