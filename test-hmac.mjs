// ponytail: check runnable de la lógica de HMAC + safeEqual del webhook.
// Corre con `node test-hmac.mjs`. Sin frameworks. Falla loud si algo cambia mal.
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const SECRET = 'signing-secret-test';
const BODY = '{"event_id":"550e8400-e29b-41d4-a716-446655440000","event_type":"sale_closed","instance_id":42,"phone":"+5491100000000","amount":100000,"currency":"ARS","closed_at":"2026-09-15T12:00:00-03:00"}';

function sign(body, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// 1. Firma reproducible.
const sig1 = sign(BODY, SECRET);
const sig2 = sign(BODY, SECRET);
assert.equal(sig1, sig2, 'firma no es determinística');

// 2. Formato esperado.
assert.match(sig1, /^sha256=[a-f0-9]{64}$/, `formato inesperado: ${sig1}`);

// 3. Cualquier cambio en el body cambia la firma.
const sigTampered = sign(BODY.replace('100000', '999999'), SECRET);
assert.notEqual(sig1, sigTampered, 'firma no detectó modificación del monto');

// 4. Secret distinto cambia la firma.
const sigWrongSecret = sign(BODY, 'otro-secret');
assert.notEqual(sig1, sigWrongSecret, 'firma no depende del secret');

// 5. safeEqual acepta iguales, rechaza distintos y de distinto tamaño.
assert.ok(safeEqual(sig1, sig2), 'safeEqual rechazó iguales');
assert.ok(!safeEqual(sig1, sigTampered), 'safeEqual aceptó firmas distintas');
assert.ok(!safeEqual('short', sig1), 'safeEqual aceptó strings de distinto tamaño');

// 6. Bearer con prefijo (simula 'Bearer <token>').
const bearer = 'my-bearer-token';
const auth = 'Bearer ' + bearer;
assert.ok(auth.startsWith('Bearer '), 'prefijo Bearer mal');
assert.ok(safeEqual(auth.slice(7), bearer), 'slice+safeEqual falla con bearer válido');

console.log('OK — 6 asserts pasaron');
