"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/wordmark";

// Guided welcome tour. Five slides, keyboard-navigable (arrow keys), with
// a persistent "Saltar" button in the top-right that fires markSeenAction
// and redirects home. The final slide's primary CTA fires startAction —
// which also marks seen and sends the user to /app/companies/new.
//
// Slide transitions are pure CSS (fade + slight y-slide). No framer-motion
// or other animation deps.

export function WelcomeTour({
  markSeenAction,
  startAction,
}: {
  markSeenAction: () => Promise<void>;
  startAction: () => Promise<void>;
}) {
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const total = 5;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (busy) return;
      if (e.key === "ArrowRight") setI((n) => Math.min(total - 1, n + 1));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
      else if (e.key === "Escape") void handleSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  async function handleSkip() {
    if (busy) return;
    setBusy(true);
    await markSeenAction();
  }

  async function handleStart() {
    if (busy) return;
    setBusy(true);
    await startAction();
  }

  return (
    <main className="min-h-screen relative flex flex-col" style={{ background: "var(--color-canvas)" }}>
      {/* Top bar: brand mark + skip */}
      <header className="flex items-center justify-between px-6 md:px-10 py-5">
        <div className="opacity-80">
          <Wordmark text="Toruk AUGUR" size="sm" />
        </div>
        <button
          type="button"
          onClick={handleSkip}
          disabled={busy}
          className="text-[12px] tracking-wider uppercase hairline rounded-md px-3 py-1.5 hover:bg-[color:var(--color-surface-2)] disabled:opacity-50"
          style={{ color: "var(--color-ink-muted)", background: "var(--color-surface-1)" }}
        >
          Saltar tutorial
        </button>
      </header>

      {/* Slide viewport */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-10">
        <div className="w-full max-w-[860px] relative" style={{ minHeight: 460 }}>
          {SLIDES.map((slide, idx) => (
            <div
              key={idx}
              aria-hidden={idx !== i}
              className="absolute inset-0 transition-all duration-500 ease-out"
              style={{
                opacity: idx === i ? 1 : 0,
                transform: idx === i ? "translateY(0)" : idx < i ? "translateY(-14px)" : "translateY(14px)",
                pointerEvents: idx === i ? "auto" : "none",
              }}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>

      {/* Footer nav */}
      <footer className="px-6 md:px-10 py-6">
        <div className="max-w-[860px] mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setI((n) => Math.max(0, n - 1))}
            disabled={i === 0 || busy}
            className="text-[13px] hairline rounded-md px-4 py-2 disabled:opacity-30"
            style={{ background: "var(--color-surface-1)", color: "var(--color-ink-muted)" }}
          >
            ← Atrás
          </button>

          <div className="flex items-center gap-2" aria-label={`Paso ${i + 1} de ${total}`}>
            {Array.from({ length: total }).map((_, dotIdx) => (
              <button
                type="button"
                key={dotIdx}
                onClick={() => setI(dotIdx)}
                disabled={busy}
                aria-label={`Ir al paso ${dotIdx + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  width: dotIdx === i ? 24 : 8,
                  height: 8,
                  background: dotIdx === i
                    ? "var(--color-primary)"
                    : dotIdx < i
                      ? "color-mix(in oklab, var(--color-primary) 30%, transparent)"
                      : "var(--color-hairline-strong)",
                }}
              />
            ))}
          </div>

          {i < total - 1 ? (
            <button
              type="button"
              onClick={() => setI((n) => Math.min(total - 1, n + 1))}
              disabled={busy}
              className="rounded-md px-4 py-2 text-[13px] font-medium"
              style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={busy}
              className="rounded-md px-4 py-2 text-[13px] font-medium disabled:opacity-60"
              style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
            >
              {busy ? "Cargando…" : "Crear primera empresa →"}
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}

/* ─────────────────────────  Slides  ───────────────────────── */

const SLIDES: React.ReactNode[] = [
  <Slide1 key="1" />,
  <Slide2 key="2" />,
  <Slide3 key="3" />,
  <Slide4 key="4" />,
  <Slide5 key="5" />,
];

function Slide1() {
  return (
    <div className="text-center flex flex-col items-center justify-center h-full">
      <p className="mb-6 text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        Bienvenido
      </p>
      <div className="mb-8">
        <Wordmark text="Toruk AUGUR" size="hero" />
      </div>
      <p
        className="text-[20px] md:text-[24px] leading-[1.4] max-w-[620px] mx-auto"
        style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-display)" }}
      >
        Contale un objetivo a la IA. Ella redacta el brief, propone creativas y arma la campaña en Meta Ads.
        <br />
        <span style={{ color: "var(--color-ink)" }}>Vos aprobás. Vos mandás.</span>
      </p>
    </div>
  );
}

function Slide2() {
  const steps = [
    { n: 1, t: "Contás qué querés", d: "Vender más, generar leads, cambiar posicionamiento. Lenguaje humano." },
    { n: 2, t: "La IA redacta el brief", d: "Te hace preguntas cortas. Público, oferta, presupuesto, tono. Sin cuestionarios eternos." },
    { n: 3, t: "Propone creativas", d: "Dos o tres variantes de copy + prompt de imagen. Vos subís las imágenes." },
    { n: 4, t: "Arma la campaña en Meta", d: "Campaign + Ad Set + Ads. En modo aprobación queda pausada, en automático se activa." },
  ];
  return (
    <div className="flex flex-col justify-center h-full">
      <p className="mb-3 text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        Cómo funciona
      </p>
      <h2
        className="mb-8 text-[36px] md:text-[44px] leading-[1.05] tracking-tight"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "-0.02em" }}
      >
        Un objetivo, cuatro pasos.
      </h2>
      <ol className="grid md:grid-cols-2 gap-3">
        {steps.map((s) => (
          <li
            key={s.n}
            className="hairline rounded-lg p-5"
            style={{ background: "var(--color-surface-1)" }}
          >
            <div className="flex items-start gap-4">
              <span
                className="shrink-0 h-9 w-9 rounded-full grid place-items-center text-[14px] font-medium"
                style={{
                  background: "var(--color-surface-2)",
                  color: "var(--color-primary)",
                  border: "1px solid var(--color-hairline)",
                }}
              >
                {s.n}
              </span>
              <div>
                <div className="text-[15px]" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
                  {s.t}
                </div>
                <div className="text-[13px] mt-1" style={{ color: "var(--color-ink-muted)" }}>
                  {s.d}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Slide3() {
  const providers = ["Anthropic", "OpenAI", "Google", "xAI", "Meta", "Mistral", "DeepSeek", "Qwen", "Moonshot", "Cohere"];
  return (
    <div className="flex flex-col justify-center h-full">
      <p className="mb-3 text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        Elegís el cerebro
      </p>
      <h2
        className="mb-4 text-[36px] md:text-[44px] leading-[1.05] tracking-tight"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "-0.02em" }}
      >
        283 modelos. En un click.
      </h2>
      <p className="mb-8 text-[16px] max-w-[620px]" style={{ color: "var(--color-ink-muted)" }}>
        Cambiás el modelo desde el selector arriba del chat, en vivo. Cada objetivo puede tener el suyo.
        El default es <strong style={{ color: "var(--color-ink)" }}>Claude Sonnet 4.6</strong> — el balance más sólido entre calidad y costo.
      </p>
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => (
          <span
            key={p}
            className="hairline rounded-full px-3 py-1.5 text-[12px] tracking-wide"
            style={{
              background: "var(--color-surface-1)",
              color: "var(--color-ink-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {p}
          </span>
        ))}
        <span
          className="rounded-full px-3 py-1.5 text-[12px] tracking-wide"
          style={{
            background: "color-mix(in oklab, var(--color-primary) 10%, var(--color-surface-1))",
            color: "var(--color-primary)",
            border: "1px solid color-mix(in oklab, var(--color-primary) 30%, transparent)",
            fontFamily: "var(--font-mono)",
          }}
        >
          + 30 más
        </span>
      </div>
    </div>
  );
}

function Slide4() {
  return (
    <div className="grid md:grid-cols-[1fr_1.05fr] gap-10 items-center h-full">
      <div>
        <p className="mb-3 text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
          Seguridad
        </p>
        <h2
          className="mb-5 text-[36px] md:text-[44px] leading-[1.05] tracking-tight"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "-0.02em" }}
        >
          Nada se publica sin tu OK.
        </h2>
        <p className="text-[16px]" style={{ color: "var(--color-ink-muted)" }}>
          Por default, la IA arma todo <strong style={{ color: "var(--color-ink)" }}>pausado</strong>.
          Vos revisás en Meta y activás cuando querés. Si preferís que la IA active sola,
          se cambia en un click — por objetivo o para toda la cuenta.
        </p>
      </div>
      <div className="hairline rounded-lg p-5 space-y-3" style={{ background: "var(--color-surface-1)" }}>
        <ModeRow
          label="Con aprobación"
          desc="La IA arma todo pausado. Vos activás en Meta."
          hint="Default seguro"
          highlight
        />
        <ModeRow
          label="Automático"
          desc="La IA activa la campaña apenas termina de armarla."
          hint="Para pruebas rápidas"
        />
      </div>
    </div>
  );
}

function ModeRow({
  label,
  desc,
  hint,
  highlight,
}: {
  label: string;
  desc: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-md p-4"
      style={{
        background: highlight ? "var(--color-surface-2)" : "transparent",
        border: highlight ? "1px solid color-mix(in oklab, var(--color-primary) 30%, transparent)" : "1px solid var(--color-hairline)",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[14px]" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
          {label}
        </span>
        <span
          className="text-[10px] tracking-wider uppercase"
          style={{ color: highlight ? "var(--color-primary)" : "var(--color-ink-subtle)" }}
        >
          {hint}
        </span>
      </div>
      <div className="text-[13px]" style={{ color: "var(--color-ink-muted)" }}>
        {desc}
      </div>
    </div>
  );
}

function Slide5() {
  return (
    <div className="text-center flex flex-col items-center justify-center h-full">
      <p className="mb-6 text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        Todo listo
      </p>
      <h2
        className="mb-4 text-[44px] md:text-[56px] leading-[1] tracking-tight"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "-0.025em" }}
      >
        Empecemos.
      </h2>
      <p className="mb-2 text-[18px] max-w-[520px]" style={{ color: "var(--color-ink-muted)" }}>
        Primer paso: dar de alta tu primera empresa —tuya o de un cliente.
      </p>
      <p className="text-[13px] max-w-[480px]" style={{ color: "var(--color-ink-subtle)" }}>
        Nombre, industria, sitio web y logo. Toma 30 segundos.
      </p>
      <div className="mt-10 flex items-center gap-3 text-[11px] tracking-wider uppercase" style={{ color: "var(--color-ink-tertiary)" }}>
        <Link href="/privacy" style={{ color: "inherit" }}>Privacidad</Link>
        <span aria-hidden>·</span>
        <Link href="/terms" style={{ color: "inherit" }}>Términos</Link>
      </div>
    </div>
  );
}
