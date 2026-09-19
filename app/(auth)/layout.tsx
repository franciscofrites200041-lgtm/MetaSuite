import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

// Auth layout: two-column editorial split. Left panel holds the wordmark,
// tagline and a couple of value-prop cues. Right panel is the form column.
// Below md, columns stack — hero shrinks to a compact top strip.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen" style={{ background: "var(--color-canvas)" }}>
      <div className="min-h-screen grid md:grid-cols-[1.05fr_1fr]">
        {/* Editorial / brand column */}
        <section
          className="relative flex flex-col justify-between px-8 md:px-14 py-10 md:py-16 hairline-b md:hairline-b-0 md:hairline-r overflow-hidden"
          style={{ background: "var(--color-surface-1)" }}
        >
          {/* Ambient decorative hairlines — very subtle, editorial feel */}
          <div aria-hidden className="absolute inset-0 pointer-events-none">
            <div
              className="absolute left-0 right-0 h-px opacity-40"
              style={{ top: "22%", background: "var(--color-hairline)" }}
            />
            <div
              className="absolute left-0 right-0 h-px opacity-30"
              style={{ top: "56%", background: "var(--color-hairline)" }}
            />
            <div
              className="absolute top-0 bottom-0 w-px opacity-40"
              style={{ left: "18%", background: "var(--color-hairline)" }}
            />
          </div>

          <div className="relative">
            <Wordmark text="Toruk AUGUR" size="sm" />
          </div>

          <div className="relative">
            <p
              className="mb-4 text-[11px] tracking-[0.18em] uppercase"
              style={{ color: "var(--color-ink-subtle)" }}
            >
              Pauta Meta operada por IA
            </p>
            <h1
              className="tracking-tight mb-6 max-w-[540px]"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: "clamp(34px, 4.6vw, 58px)",
                lineHeight: 1.02,
                letterSpacing: "-0.02em",
              }}
            >
              Un objetivo,
              <br />
              <span style={{ color: "var(--color-ink-muted)" }}>una conversación,</span>
              <br />
              campañas listas.
            </h1>
            <p className="text-[14px] leading-[1.6] max-w-[440px]" style={{ color: "var(--color-ink-muted)" }}>
              Contale a la IA qué querés lograr. Redacta el brief, propone
              creativas y arma la campaña en Meta Ads. Vos aprobás. Vos mandás.
            </p>
          </div>

          <div className="relative flex items-center gap-5 text-[11px] tracking-wider uppercase" style={{ color: "var(--color-ink-tertiary)" }}>
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
