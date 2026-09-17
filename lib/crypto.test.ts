// ponytail: single self-check for the security-critical crypto module.
// Run: `META_TOKEN_ENC_KEY=$(openssl rand -hex 32) node --loader ts-node/esm lib/crypto.test.ts`
// or from a Node REPL — no framework, no fixtures.
import assert from "node:assert/strict";
import { encryptToken, decryptToken } from "./crypto";

const cases = [
  "EAAABc1DEfghIJKlmnOP",
  "",
  "áéíóúñçÜßÖ 汉字 עברית",
  "a".repeat(4096),
];

for (const plain of cases) {
  const enc = encryptToken(plain);
  assert.ok(enc.ciphertext.length > 0 || plain.length === 0, `ciphertext missing for len=${plain.length}`);
  assert.ok(enc.iv.length > 0, "iv missing");
  assert.ok(enc.tag.length > 0, "tag missing");
  const back = decryptToken(enc.ciphertext, enc.iv, enc.tag);
  assert.equal(back, plain, `round-trip mismatch for len=${plain.length}`);
}

// Tampered tag must be rejected (GCM authentication).
{
  const enc = encryptToken("secret");
  const badTag = Buffer.from(enc.tag, "base64");
  badTag[0] ^= 0xff;
  assert.throws(() => decryptToken(enc.ciphertext, enc.iv, badTag.toString("base64")), /auth/i);
}

// Two encryptions of the same plaintext produce different ciphertexts (random IV).
{
  const a = encryptToken("same");
  const b = encryptToken("same");
  assert.notEqual(a.ciphertext, b.ciphertext, "IV reuse: ciphertext identical");
}

console.log("crypto.test.ts: OK — 4 round-trips, tamper detection, IV randomness.");
