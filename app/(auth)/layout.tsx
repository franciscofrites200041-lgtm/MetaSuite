import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

// Auth layout: two-column editorial split. Left panel is a bold typographic
// hero centered on a HUGE animated wordmark (kinetic entry + ambient wave +
// color pulse). Everything else is deliberately quiet so the mark dominates.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen" style={{ background: "var(--color-canvas)" }}>
      <div className="min-h-screen grid md:grid-cols-[1.15fr_1fr]">
        {/* Editorial / brand column */}
        <section
          className="relative flex flex-col justify-between px-8 md:px-14 py-10 md:py-14 hairline-b md:hairline-b-0 md:hairline-r overflow-hidden"
          style={{ background: "var(--color-surface-1)" }}
        >
          {/* Ambient decorative hairlines — quiet, editorial rhythm. */}
          <div aria-hidden className="absolute inset-0 pointer-events-none">
            <div
              className="absolute left-0 right-0 h-px opacity-40"
              style={{ top: "24%", background: "var(--color-hairline)" }}
            />
            <div
              className="absolute left-0 right-0 h-px opacity-30"
              style={{ top: "68%", background: "var(--color-hairline)" }}
            />
            <div
              className="absolute top-0 bottom-0 w-px opacity-30"
              style={{ left: "14%", background: "var(--color-hairline)" }}
            />
          </div>

          {/* Top eyebrow */}
          <div className="relative flex items-center gap-3 text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
            <span className="inline-block h-px w-8" style={{ background: "var(--color-ink-tertiary)" }} />
            <span>Pauta Meta operada por IA</span>
          </div>

          {/* HERO — the wordmark itself is the message. */}
          <div className="relative flex-1 flex flex-col justify-center py-10">
            <div className="mb-8">
              <Wordmark text="Toruk AUGUR" size="hero" />
            </div>
            <p
              className="text-[16px] md:text-[18px] leading-[1.5] max-w-[480px]"
              style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-display)" }}
            >
              Un objetivo, una conversación,
              <br />
              campañas listas.
            </p>
          </div>

          {/* Footer */}
          <div className="relative flex items-center gap-4 text-[11px] tracking-wider uppercase" style={{ color: "var(--color-ink-tertiary)" }}>
            <span>Meta Ads · v21</span>
            <span aria-hidden>·</span>
            <Link href="/privacy" style={{ color: "inherit" }}>Privacidad</Link>
            <span aria-hidden>·</span>
            <Link href="/terms" style={{ color: "inherit" }}>Términos</Link>
          </div>
        </section>

        {/* Form column */}
        <section className="flex items-center justify-center px-6 sm:px-10 py-12 md:py-16">
          <div className="w-full max-w-[420px]">{children}</div>
        </section>
      </div>
    </main>
  );
}
