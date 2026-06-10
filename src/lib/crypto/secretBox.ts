/**
 * Authenticated-secret envelope encryption for integration credentials.
 *
 * Third-party API keys (TruTac/TruLinks, Microlise, …) are stored encrypted at
 * rest. We use AES-256-GCM with a server-held key (INTEGRATION_ENCRYPTION_KEY)
 * so the plaintext secret is never written to the database and the key itself
 * never leaves the server. GCM gives us authentication as well as secrecy, so a
 * tampered ciphertext fails to decrypt rather than yielding garbage.
 *
 * Envelope layout (then base64-encoded): iv(12) ‖ authTag(16) ‖ ciphertext.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Accept the key as 64 hex chars or base64; both must decode to 32 bytes. */
function toKeyBuffer(rawKey: string): Buffer {
  const buf = /^[0-9a-fA-F]{64}$/.test(rawKey)
    ? Buffer.from(rawKey, "hex")
    : Buffer.from(rawKey, "base64");
  if (buf.length !== 32) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY must decode to 32 bytes (64 hex chars or base64).",
    );
  }
  return buf;
}

/** Encrypt a UTF-8 secret, returning a base64 envelope safe to store as text. */
export function encryptSecret(plaintext: string, rawKey: string): string {
  const key = toKeyBuffer(rawKey);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

/** Decrypt a base64 envelope produced by {@link encryptSecret}. */
export function decryptSecret(envelope: string, rawKey: string): string {
  const key = toKeyBuffer(rawKey);
  const raw = Buffer.from(envelope, "base64");
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8",
  );
}
