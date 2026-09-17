import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM. Key comes from META_TOKEN_ENC_KEY (64-char hex = 32 bytes).
// Ciphertext, iv, and tag are stored as base64 text columns in meta_connections.
function getKey(): Buffer {
  const hex = process.env.META_TOKEN_ENC_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("META_TOKEN_ENC_KEY must be a 64-char hex string (32 bytes).");
  }
  return Buffer.from(hex, "hex");
}

export function encryptToken(plain: string): { ciphertext: string; iv: string; tag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const buf = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: buf.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptToken(ciphertext: string, iv: string, tag: string): string {
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}
