import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM. Key comes from META_TOKEN_ENC_KEY (64-char hex = 32 bytes).
// Ciphertext, iv, and tag are stored as separate bytea columns.
function getKey(): Buffer {
  const hex = process.env.META_TOKEN_ENC_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("META_TOKEN_ENC_KEY must be a 64-char hex string (32 bytes).");
  }
  return Buffer.from(hex, "hex");
}

export function encryptToken(plain: string): { ciphertext: Buffer; iv: Buffer; tag: Buffer } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, iv, tag };
}

export function decryptToken(ciphertext: Buffer, iv: Buffer, tag: Buffer): string {
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
