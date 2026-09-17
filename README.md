# Toruk AUGUR — MVP

Módulo de gestión de pauta Meta Ads operado por IA. Un objetivo, un chat, campañas listas.

Rama `MVP` del repo `MetaSuite`. Spec completa en `../MVP/toruk-augur-mvp-spec.md`. Sistema de diseño en `./DESIGN.md`.

## Stack

- **Next.js 15** (App Router, TypeScript, Server Actions)
- **Tailwind CSS 4** con tokens del `DESIGN.md` en `app/globals.css`
- **Supabase** — Postgres + Auth + Storage vía `@supabase/ssr`
- **OpenRouter** para la capa de IA (Vercel AI SDK)
- **Meta Ads MCP** (se cablea próxima sesión)

## Arranque local

### 1. Prerequisitos

- Node.js ≥ 20
- Cuenta Supabase (proyecto nuevo) — o Supabase local con Docker
- Cuenta OpenRouter (opcional para el chat real; el scaffold tiene fallback stub)

### 2. Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

```bash
cp .env.example .env.local
```

Valores mínimos para que el auth ande:

- `NEXT_PUBLIC_SUPABASE_URL` — de `Settings → API` en tu proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — mismo lugar
- `SUPABASE_SERVICE_ROLE_KEY` — mismo lugar (nunca lo expongas al cliente)
- `META_TOKEN_ENC_KEY` — 32 bytes hex. Generalo:
  ```bash
  openssl rand -hex 32
  ```

### 3. Migraciones de Supabase

Con Supabase CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```

O pegá el contenido de `supabase/migrations/20260916000000_init_augur.sql` en `SQL Editor` del dashboard de Supabase y corré.

La migración crea:
- Todas las tablas del spec § 4 (accounts, companies, objectives, chat_*, ad_creatives, campaigns/ad_sets/ads)
- RLS activo en todas
- Trigger `on_auth_user_created` que auto-crea una `account` + `account_member` cuando se registra un usuario
- Buckets de Storage `company-logos` (público) y `briefs` (privado)

### 4. Instalar + correr

```bash
npm install
npm run dev
```

Abrir http://localhost:3000. Debería redirigir a `/login`.

Flujo de smoke test:
1. Signup con email + contraseña
2. Alta de la primera empresa
3. Nuevo objetivo (con o sin brief)
4. Chat: escribir un mensaje. Sin `OPENROUTER_API_KEY` el asistente responde con un stub explícito.

## Estructura

```
metasuite/
├── app/
│   ├── (auth)/          # login, signup — grupo con layout centrado
│   ├── (app)/           # dashboard — grupo con sidebar
│   │   ├── page.tsx     # home: onboarding o redirect a primera empresa
│   │   ├── companies/new/
│   │   └── c/[slug]/
│   │       ├── page.tsx # overview de empresa: Meta status + objetivos
│   │       └── objectives/[id]/  # vista de objetivo — chat + brief + panels
│   ├── auth/            # callback y signout de Supabase
│   ├── api/chat/        # endpoint del chat (stub hoy, OpenRouter next)
│   ├── layout.tsx       # fuentes globales + globals.css
│   └── page.tsx         # gate: /login vs /app
├── components/          # sidebar, objective-chat
├── lib/
│   ├── supabase/        # server/client/middleware/admin
│   ├── crypto.ts        # AES-GCM para tokens Meta
│   └── models.ts        # curated OpenRouter models
├── supabase/
│   ├── config.toml
│   └── migrations/20260916000000_init_augur.sql
├── DESIGN.md            # sistema de diseño del dashboard
├── middleware.ts        # gate de auth
└── package.json
```

## Estado del MVP

Sección 2 del spec como norte.

### ✅ Listo en esta rama
- Rama `MVP` con scaffold Next.js completo
- Schema Supabase completo con RLS + trigger de onboarding
- Auth funcional (signup / login / logout / callback)
- Alta de empresa
- Alta de objetivo (con brief opcional)
- Vista de objetivo con **chat central + brief editable + panels de creativas y campañas**
- DESIGN.md con paleta hueso/crema + naranja Toruk, Space Grotesk / Inter / JetBrains Mono
- Selector de modelo (lista curada OpenRouter) en el chat
- Chat persistente (mensajes se guardan en `chat_messages`, RLS enforced)

### ⏳ Próximas sesiones
- Wiring real de OpenRouter + Vercel AI SDK (streaming, agentes)
- Orquestación multi-agente (spec § 6): briefing, copywriter, visual, meta-builder
- OAuth de Meta Ads + `/api/meta/callback` + storage encriptado de tokens
- MCP Meta Ads — creación de campaign/ad set/ad
- Modo `auto` vs `approval` en las publicaciones
- Storage de logos + upload de brief `.md`

## Diseño

Ver `DESIGN.md`. Tokens en `app/globals.css`. Regla: naranja Toruk (`#E85A1C`) solo para decisiones y voz de la IA. Todo lo demás vive en neutros cálidos sobre canvas hueso (`#F6F1E7`).

Referencias que consumió el sistema: Linear (grid, hairlines), Vercel (tipografía), Notion (calidez editorial). Los DESIGN.md fuente están en `design-refs/design-md/{linear.app,vercel,notion}` — no se commitean (submódulo).

## Deployment (próxima sesión)

Vercel. Env vars: mismas que `.env.example` más `NEXT_PUBLIC_APP_URL` apuntando al dominio.
