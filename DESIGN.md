---
version: alpha
name: Toruk-AUGUR-dashboard
description: "A warm bone-cream product surface built for a chat-first control room. Linear's dense grid discipline and hairline restraint, Vercel's typographic precision, Notion's editorial warmth. The dashboard is quiet by default so the AI chat and the campaign artefacts can lead. Space Grotesk for display, Inter for body, JetBrains Mono for identifiers. Toruk orange is the ONLY chromatic accent — reserved for primary CTAs, active states, and the AI voice. No gradients, no shadows heavier than a 1px hairline."
colors:
  # Toruk brand (from landing) — used sparingly here
  primary: "#E85A1C"
  primary-hover: "#FB7333"
  primary-pressed: "#C64510"
  on-primary: "#FFFAF3"
  # Surfaces — bone / cream ladder (WARM, never pure white)
  canvas: "#F6F1E7"
  surface-1: "#FBF7EE"
  surface-2: "#FFFCF5"
  surface-inverse: "#141110"
  # Hairlines
  hairline: "#E3DBC8"
  hairline-strong: "#CDC3AA"
  # Ink (warm near-black → subtle)
  ink: "#141110"
  ink-muted: "#4A4643"
  ink-subtle: "#8B857D"
  ink-tertiary: "#B5AEA1"
  # Semantic — muted to blend with the warm canvas
  success: "#3A7A3E"
  warning: "#B47409"
  danger: "#B33A2C"
  info: "#3C6E9C"
  # AI-voice highlight (used behind assistant messages, sparingly)
  ai-surface: "#F1E9D3"
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: 500
    lineHeight: 1.10
    letterSpacing: -1.2px
  display:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: -0.8px
  headline:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: -0.4px
  card-title:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.30
    letterSpacing: -0.2px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: -0.05px
  body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.40
    letterSpacing: 0.1px
  eyebrow:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.30
    letterSpacing: 0.6px
  button:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.20
    letterSpacing: 0
  mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  pill: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 64px
---

## Overview

AUGUR is a chat-first cockpit. Every screen exists to feed one central conversation with the AI about a specific advertising objective. The visual identity descends from three lineages: **Linear's** hairline-first density and surface ladder, **Vercel's** typographic precision, and **Notion's** warm editorial cream. It rejects the density-for-density-sake of BI dashboards and the sterile whiteness of most SaaS.

The system anchors on a **bone canvas** (`{colors.canvas}` #F6F1E7). Panels lift onto warmer surfaces (`{colors.surface-1}`, `{colors.surface-2}`). The only chromatic accent is **Toruk orange** (`{colors.primary}` #E85A1C) — reserved for primary CTAs, the active row in the sidebar, the "AI is thinking" indicator, and the send button on the chat. Everything else lives in warm neutrals.

Type: **Space Grotesk** (500 weight, negative tracking) for display and titles; **Inter** (400/500) for body and UI; **JetBrains Mono** for ids, tokens, and status codes.

**Key Characteristics:**
- Warm bone canvas — never `#FFF`, never dark, never yellow.
- Single accent — Toruk orange used scarcely.
- Hairline discipline — 1px `{colors.hairline}` borders carry hierarchy. Shadows only on floating menus.
- Chat centrality — every objective screen puts the chat in the visual center; brief and campaign panels are secondary rails.
- Silent chrome — the sidebar is narrow, monochrome, and never competes with content.
- No gradients. No decorative color. No emoji as UI ornamentation.

## Layout Principles

### Global shell

- **Sidebar** (fixed, 240px, `{colors.surface-1}`): company switcher at top → list of objectives → user menu at bottom. 1px right hairline. No icons compete with labels; labels lead, icons follow at 14px.
- **Main column**: `{colors.canvas}` with 32px top padding, 40px horizontal. Max content width 1280px, centered when the viewport is wide.
- **Right rail** (only on objective view): 360px, `{colors.surface-1}`, holds the brief markdown editor + campaign/creative list. 1px left hairline.

### Chat as protagonist

On the objective screen the chat column occupies the full remaining width between sidebar and right rail (roughly 640–840px). Messages sit on `{colors.surface-2}` cards with 12px radius. Assistant messages carry a hair of `{colors.ai-surface}` on their left edge (3px bar) — the ONLY place the AI voice is visually marked.

### Spacing scale

`{spacing.xxs}` 4 · `{spacing.xs}` 8 · `{spacing.sm}` 12 · `{spacing.md}` 16 · `{spacing.lg}` 24 · `{spacing.xl}` 32 · `{spacing.xxl}` 48 · `{spacing.section}` 64.

Card interior: `{spacing.lg}` 24px. Grid gutter: `{spacing.md}` 16px. Section separation: `{spacing.section}` 64px.

## Components

### `button-primary` — Toruk orange CTA
- background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button}`, padding 8px 14px, rounded `{rounded.md}`.
- Hover → `{colors.primary-hover}`. Pressed → `{colors.primary-pressed}`.
- Reserved for: "Publicar", "Crear objetivo", "Conectar Meta Ads", chat send.

### `button-secondary` — bone chip
- background `{colors.surface-2}`, text `{colors.ink}`, 1px `{colors.hairline-strong}`, padding 8px 14px, rounded `{rounded.md}`.

### `button-ghost` — chromeless
- background transparent, text `{colors.ink-muted}`, padding 6px 10px. Hover fills with `{colors.surface-1}`.

### `input`
- background `{colors.surface-2}`, 1px `{colors.hairline}`, padding 10px 12px, rounded `{rounded.md}`, type `{typography.body}`. Focus: 1px `{colors.primary}` border, no ring.

### `card`
- background `{colors.surface-1}`, 1px `{colors.hairline}`, rounded `{rounded.lg}`, padding 24px.

### `chat-message` (user)
- background `{colors.surface-2}`, rounded `{rounded.lg}`, padding 12px 16px, aligned right, max-width 620px.

### `chat-message` (assistant)
- background `{colors.surface-1}`, rounded `{rounded.lg}`, padding 12px 16px, 3px left border `{colors.primary}` at 60% opacity, aligned left, max-width 620px.

### `status-badge`
- `{rounded.pill}`, padding 2px 8px, `{typography.caption}` uppercase-ish (letter-spacing 0.6px).
- Draft → surface-1 / ink-subtle. Pending → warning. Published → success. Paused → ink-muted.

### `sidebar-row`
- padding 6px 10px, rounded `{rounded.sm}`, `{typography.body-sm}` ink-muted. Active → `{colors.primary}` at 8% background + `{colors.primary}` text. Hover → `{colors.hairline}` fill.

## Do's and Don'ts

### Do
- Reserve orange for **decisions and the AI voice** — nowhere else.
- Use type contrast (Space Grotesk display vs Inter body) to carry hierarchy — resist ink-color changes for hierarchy.
- Frame every objective around the chat. Every other panel yields.
- Prefer negative space to dividers. When you need a boundary, use 1px `{colors.hairline}`.
- Use mono (`{typography.mono}`) for Meta IDs, model IDs, brief filenames, timestamps.

### Don't
- Don't use pure white `#FFFFFF` as any surface.
- Don't introduce a second accent (blue, green, teal, purple). One accent, always orange.
- Don't add gradients, glows, or soft shadows heavier than `0 1px 2px rgba(20,17,16,0.06)`.
- Don't nest cards inside cards inside cards. Flat panels, not fractals.
- Don't decorate the chat with rounded avatars, emoji, or gradient bubbles — this is a professional cockpit.

## Substitutes

- **Space Grotesk** — Google Fonts, weights 400/500/600 sufficient.
- **Inter** — Google Fonts, weights 400/500.
- **JetBrains Mono** — Google Fonts, weight 400.

## Applies to

Everything under `app/(app)/**` — the dashboard. The public landing (post-MVP) uses a different, darker identity per the Toruk brand manifesto.
