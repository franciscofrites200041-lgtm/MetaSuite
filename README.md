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

## Deploy en Portainer (con Nginx Proxy Manager existente)

1. **Averiguar el nombre de la network del nginx**: en el VPS, `docker network ls`. Suele ser `nginx-proxy_default` o el nombre del stack donde vive NPM.
2. **Crear stack en Portainer** → "Repository":
   - URL: `https://github.com/franciscofrites200041-lgtm/MetaSuite.git`
   - Compose path: `docker-compose.yml`
3. **Environment variables** (mínimas):
   - `POSTGRES_PASSWORD`
   - `SPOTER_TO_METASUITE_BEARER`
   - `SPOTER_TO_METASUITE_SIGNING_SECRET`
   - `PROXY_NETWORK` (nombre de la red del nginx, si no es `nginx-proxy_default`)
4. **Deploy**. Verificar que el container `metasuite-api-1` corre y está conectado a la network `proxy`.
5. **En Nginx Proxy Manager** → Proxy Hosts → Add Proxy Host:
   - **Domain Names**: el dominio que vas a usar (ej. `metasuite.spoter.ar`)
   - **Scheme**: `http`
   - **Forward Hostname/IP**: `metasuite-api-1` (nombre del container, ver `docker ps`)
   - **Forward Port**: `3000`
   - ✅ **Block Common Exploits**
   - ✅ **Websockets Support** (por las dudas)
   - Tab **SSL**: Request a new SSL certificate + Force SSL + HTTP/2 + activar HSTS.
6. **Verificar**: `curl https://<dominio>/health` → `{"ok":true,...}`

### Auth del dashboard

El `/api/events` y `/` no tienen auth. Antes de exponerlos a internet:
- En NPM → editar el proxy host → tab "Access List" → crear una Access List con basic auth y aplicarla.
- **Excluir `/webhook/conversion` y `/health`** de la Access List (Spoter no puede mandar basic auth, ya autentica con bearer + HMAC).

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
