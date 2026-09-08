import Fastify from 'fastify';
import crypto from 'node:crypto';
import { sql, health } from '../lib/db.js';

const PORT = Number(process.env.PORT || 3000);
const BEARER = process.env.SPOTER_TO_METASUITE_BEARER;
const SIGNING_SECRET = process.env.SPOTER_TO_METASUITE_SIGNING_SECRET;

if (!BEARER || !SIGNING_SECRET) {
  throw new Error('Faltan SPOTER_TO_METASUITE_BEARER y/o SPOTER_TO_METASUITE_SIGNING_SECRET');
}

const VALID_EVENT_TYPES = new Set(['sale_closed', 'lead_lost', 'sale_cancelled']);

const fastify = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' } });

// Capturar body raw además de parsear JSON — necesario para HMAC.
fastify.addContentTypeParser(
  'application/json',
  { parseAs: 'buffer' },
  (req, body, done) => {
    req.rawBody = body;
    if (body.length === 0) return done(null, {});
    try {
      done(null, JSON.parse(body.toString('utf8')));
    } catch (err) {
      done(err, undefined);
    }
  }
);

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

fastify.get('/health', async () => {
  const ok = await health();
  return { ok, ts: new Date().toISOString() };
});

fastify.post('/webhook/conversion', async (req, reply) => {
  // 1. Bearer
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ') || !safeEqual(auth.slice(7), BEARER)) {
    return reply.code(401).send({ error: 'unauthorized' });
  }

  // 2. HMAC del body crudo
  const provided = req.headers['x-metasuite-signature'] || '';
  const expected = 'sha256=' + crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(req.rawBody)
    .digest('hex');
  if (!safeEqual(provided, expected)) {
    return reply.code(401).send({ error: 'unauthorized' });
  }

  // 3. Validación de payload
  const { event_id, event_type, instance_id } = req.body || {};
  if (!event_id || !event_type || !instance_id) {
    return reply.code(400).send({ error: 'missing event_id, event_type or instance_id' });
  }
  if (!VALID_EVENT_TYPES.has(event_type)) {
    return reply.code(400).send({ error: `unknown event_type: ${event_type}` });
  }

  // 4. Resolver client_id desde spoter_instance_id (nullable en el MVP — Surmotors se seedea aparte)
  const [client] = await sql`
    SELECT id FROM clients WHERE spoter_instance_id = ${instance_id} LIMIT 1
  `;

  // 5. Insert idempotente. Duplicados devuelven 200 sin hacer nada.
  const inserted = await sql`
    INSERT INTO inbox_events (event_id, client_id, event_type, payload)
    VALUES (${event_id}, ${client?.id ?? null}, ${event_type}, ${sql.json(req.body)})
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
  `;

  const duplicate = inserted.length === 0;
  return reply.code(200).send({ success: true, event_id, duplicate });
});

fastify.listen({ port: PORT, host: '0.0.0.0' }, (err, addr) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`MetaSuite API escuchando en ${addr}`);
});

// ponytail: check runnable. `node api/server.js` con env mínima levanta y /health responde.
// Test HMAC manual con el curl del §10 de spoter-webhook-spec.md.
