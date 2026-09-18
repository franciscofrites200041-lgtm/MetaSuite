# Toruk AUGUR — MVP

Módulo de gestión de pauta Meta Ads operado por IA. Un objetivo, un chat, campañas listas.

Rama `main` (código en la raíz). Spec completa en `../MVP/toruk-augur-mvp-spec.md`. Sistema de diseño en `./DESIGN.md`.

## Stack

- **Next.js 15** (App Router, TypeScript, Server Actions) hospedado en Vercel
- **Tailwind CSS 4** con tokens del `DESIGN.md` en `app/globals.css`
- **Supabase** — Postgres + Auth + Storage vía `@supabase/ssr`
- **OpenRouter** para la capa de IA (Vercel AI SDK v4 con provider @ai-sdk/openai apuntado a OpenRouter)
- **Meta Marketing API v21** — campaign, ad set, ad creative, ad, upload de imagen

## Checklist para producción (una sola vez)

### 1. Supabase

1. Crear proyecto en https://supabase.com/dashboard.
2. Settings → API: copiar `URL`, `anon key`, `service_role key`.
3. SQL Editor: pegar y correr `supabase/migrations/20260916000000_init_augur.sql`.
   - Crea 11 tablas, RLS activo, trigger `on_auth_user_created` que auto-crea account+membership al signup.
   - Crea buckets `company-logos` (público), `creative-media` (público), `briefs` (privado).
4. Authentication → Providers: activar Email/Password (default).
5. Authentication → URL Configuration: agregar `https://<dominio-vercel>` a `Site URL` y `Redirect URLs`.

### 2. Meta App (Facebook Developers)

1. https://developers.facebook.com/apps → Create App → "Other" → "Business".
2. Products → Facebook Login for Business → Set up:
   - Valid OAuth Redirect URIs: `https://<dominio-vercel>/api/meta/callback`
3. Products → Marketing API → Add.
4. Copiar App ID y App Secret de Settings → Basic.
5. App Roles → agregarte a vos como tester para probar en modo Development.
6. Para prod real: enviar a App Review pidiendo `ads_management`, `ads_read`, `pages_manage_ads`.

### 3. OpenRouter

1. https://openrouter.ai/keys → generar API key.
2. Cargar crédito (a fines de MVP US$5 alcanzan para muchas horas de uso).

### 4. Vercel env vars

Project Settings → Environment Variables (Production + Preview + Development todas):

```
NEXT_PUBLIC_SUPABASE_URL         = https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY    = <anon>
SUPABASE_SERVICE_ROLE_KEY        = <service-role>
META_TOKEN_ENC_KEY               = <64 hex chars — openssl rand -hex 32>
OPENROUTER_API_KEY               = sk-or-...
META_APP_ID                      = <fb app id>
META_APP_SECRET                  = <fb app secret>
META_OAUTH_REDIRECT_URI          = https://<dominio-vercel>/api/meta/callback
NEXT_PUBLIC_APP_URL              = https://<dominio-vercel>
```

Redeploy después de guardarlas.

## Flujo end-to-end

1. Signup → auto-crea `account` + `account_member`.
2. Alta de empresa (nombre, industria, descripción, sitio web, logo).
3. Botón "Conectar Meta Ads" → OAuth → guarda token long-lived encriptado.
4. Nuevo objetivo → chat con la IA.
5. La IA hace preguntas de descubrimiento, redacta el brief (tool `save_brief`).
6. La IA propone creativas (tool `propose_creative`).
7. **Usuario sube una imagen** por cada creativa que quiera usar (panel derecho).
8. La IA presenta el plan de campaña → usuario confirma → tool `build_campaign_in_meta` crea campaign + ad set en Meta.
9. Vista de campaña → botón **"Publicar ad"** por cada ad draft crea el AdCreative + Ad reales en Meta.
   - Modo `approval` → todo queda en PAUSED, botón "Publicar" en la vista de campaña activa.
   - Modo `auto` → los ads se crean ACTIVE al toque.

## Estructura

```
metasuite/
├── app/
│   ├── (auth)/                        login, signup — grupo con layout centrado
│   ├── app/                           dashboard protegido (URL /app/*)
│   │   ├── page.tsx                   home
│   │   ├── companies/new/
│   │   └── c/[slug]/
│   │       ├── page.tsx               overview: Meta status + objetivos
│   │       ├── settings/              form de empresa (logo, website)
│   │       ├── objectives/[id]/
│   │       │   ├── page.tsx           chat central + brief + creativas + campañas
│   │       │   └── creative-actions.ts  server action: upload de imagen
│   │       └── campaigns/[id]/
│   │           ├── page.tsx           ad sets + ads + publicar/pausar
│   │           └── ad-actions.ts      server action: publishAdInMeta
│   ├── preview/                       demo pública sin auth ni backend
│   ├── auth/                          callback + signout de Supabase
│   ├── api/
│   │   ├── chat/                      streamText con OpenRouter + tools
│   │   └── meta/                      oauth, callback
│   ├── layout.tsx
│   └── page.tsx                       gate: /login vs /app
├── components/                        sidebar, objective-chat
├── lib/
│   ├── supabase/                      server/client/middleware/admin/env
│   ├── ai/                            openrouter, prompts, tools
│   ├── meta/                          graph (API client), build (orquestación)
│   ├── crypto.{ts,test.ts}            AES-GCM tokens + self-check
│   └── models.ts                      curated OpenRouter models
├── supabase/
│   ├── config.toml
│   └── migrations/20260916000000_init_augur.sql
├── DESIGN.md
├── middleware.ts
├── next.config.ts
└── vercel.json
```

## Cosas fuera del MVP (fase 2)

- Tracking de performance + feedback loop (redistribución de budget).
- Generación de imágenes integrada (hoy el usuario sube).
- Google/TikTok Ads.
- Multi-ad-account picker en el OAuth (hoy toma el primero).
- Facturación / planes pagos.

## Local

```bash
cp .env.example .env.local
# rellenar con los mismos valores de arriba
npm install
supabase link --project-ref <ref>
supabase db push
npm run dev
```
