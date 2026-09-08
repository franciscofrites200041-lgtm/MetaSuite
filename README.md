# MetaSuite

Optimizador de pautas Meta + multiplicador de creativas.
Piloto: Surmotors. Docs completos: `../mvp-optimizador-pautas.md`, `../spoter-webhook-spec.md`.

## Estado (sprint A — parcial)

- ✅ Docker Compose (postgres + api + caddy)
- ✅ Schema inicial de Postgres (`db/init.sql`, 14 tablas)
- ✅ Webhook receiver Spoter → MetaSuite con Bearer + HMAC + idempotencia
- ✅ Front mínimo: dashboard de eventos recibidos en `/`
- ⏳ Pendiente: poller MCP Meta, workers (decisor/aplicador/generador), Explorador de Pauta

## Arranque local

```bash
cp .env.example .env
# completar SPOTER_TO_METASUITE_BEARER, SPOTER_TO_METASUITE_SIGNING_SECRET, POSTGRES_PASSWORD
docker compose up --build
```

Test del webhook:

```bash
BODY='{"event_id":"test-1","event_type":"sale_closed","instance_id":42,"phone":"+5491100000000","amount":100000,"currency":"ARS","closed_at":"2026-09-15T12:00:00-03:00"}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SPOTER_TO_METASUITE_SIGNING_SECRET" -hex | cut -d' ' -f2)

curl -X POST http://localhost/webhook/conversion \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SPOTER_TO_METASUITE_BEARER" \
  -H "X-MetaSuite-Signature: sha256=$SIG" \
  -d "$BODY"
```

Segundo request idéntico → `{"duplicate": true}`.

## Acceder al dashboard

Una vez el stack está arriba, abrir en el navegador:

- **Local (dev)**: http://localhost/
- **Prod**: https://<DOMAIN>/

El dashboard muestra los últimos 50 eventos recibidos vía webhook, con estado (pendiente / procesado / error) y payload expandible. Auto-refresh cada 5s.

Endpoints:
- `GET /` → dashboard
- `GET /health` → healthcheck
- `GET /api/events?limit=N` → JSON con eventos recientes
- `POST /webhook/conversion` → receiver (Bearer + HMAC obligatorios)

## Deploy en Portainer

1. Crear stack nuevo en Portainer, apuntando al repo Git.
2. Cargar variables de entorno (idem `.env.example`).
3. Ajustar `Caddyfile` con el dominio real (`DOMAIN` env var).
4. Deploy. Health: `curl https://<dominio>/health`.

## Estructura

```
metasuite/
├── api/server.js        # HTTP entrypoint (webhook + health)
├── lib/db.js            # cliente Postgres
├── db/init.sql          # schema — se aplica al primer arranque
├── workers/             # (vacío — poller/decisor/aplicador/generador)
├── prompts/             # (vacío — templates del analista y generador)
├── knowledge/surmotors/ # (vacío — MDs de contexto para el analista)
├── Dockerfile
├── docker-compose.yml
└── Caddyfile
```
