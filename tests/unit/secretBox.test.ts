import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { encryptSecret, decryptSecret } from "@/lib/crypto/secretBox";

describe("secretBox", () => {
  const key = randomBytes(32).toString("base64");

  it("round-trips a secret through encrypt/decrypt", () => {
    const plaintext = "trulinks_live_abc123";
    const envelope = encryptSecret(plaintext, key);
    expect(envelope).not.toContain(plaintext);
    expect(decryptSecret(envelope, key)).toBe(plaintext);
  });

  it("produces a different envelope each time (random IV)", () => {
    const a = encryptSecret("same", key);
    const b = encryptSecret("same", key);
    expect(a).not.toBe(b);
  });

  it("accepts a hex-encoded 32-byte key", () => {
    const hexKey = randomBytes(32).toString("hex");
    expect(decryptSecret(encryptSecret("hi", hexKey), hexKey)).toBe("hi");
  });

  it("rejects a key that is not 32 bytes", () => {
    expect(() => encryptSecret("x", "too-short")).toThrow();
  });

  it("fails to decrypt with the wrong key", () => {
    const envelope = encryptSecret("secret", key);
    const wrong = randomBytes(32).toString("base64");
    expect(() => decryptSecret(envelope, wrong)).toThrow();
  });

  it("fails to decrypt a tampered envelope (GCM auth)", () => {
    const envelope = encryptSecret("secret", key);
    const bytes = Buffer.from(envelope, "base64");
    const last = bytes.length - 1;
    bytes[last] = bytes[last]! ^ 0xff; // flip a ciphertext bit
    expect(() => decryptSecret(bytes.toString("base64"), key)).toThrow();
  });
});
