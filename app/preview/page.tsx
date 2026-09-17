import Link from "next/link";

export default function PreviewIndex() {
  return (
    <section className="max-w-[720px] mx-auto px-10 pt-16">
      <p className="mb-2 text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        Preview
      </p>
      <h1
        className="text-[36px] leading-[1.1] tracking-tight"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
      >
        Este es el look del dashboard de AUGUR.
      </h1>
      <p className="mt-4 text-[15px]" style={{ color: "var(--color-ink-muted)" }}>
        Ruta pública para revisar diseño sin backend. Cargá las env vars de Supabase / OpenRouter / Meta
        para que el flujo real (auth, chat, campañas) funcione.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/preview/c/surmotors"
          className="rounded-md px-4 py-2.5 text-[13px] font-medium"
          style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
        >
          Ver empresa
        </Link>
        <Link
          href="/preview/c/surmotors/objectives/1"
          className="hairline rounded-md px-4 py-2.5 text-[13px]"
          style={{ background: "var(--color-surface-2)", color: "var(--color-ink)" }}
        >
          Ver objetivo (chat central)
        </Link>
      </div>

      <div className="mt-16 hairline-t pt-8">
        <p className="text-[11px] tracking-[0.14em] uppercase mb-4" style={{ color: "var(--color-ink-subtle)" }}>
          Sistema de diseño
        </p>
        <div className="grid grid-cols-6 gap-3">
          {[
            ["Canvas", "#F6F1E7"],
            ["Surface 1", "#FBF7EE"],
            ["Surface 2", "#FFFCF5"],
            ["Primary", "#E85A1C"],
            ["Ink", "#141110"],
            ["Ink muted", "#4A4643"],
          ].map(([name, hex]) => (
            <div key={name} className="hairline rounded-md p-3 text-[11px]">
              <div className="h-8 rounded-sm mb-2" style={{ background: hex }} />
              <div>{name}</div>
              <div style={{ color: "var(--color-ink-subtle)", fontFamily: "var(--font-mono)" }}>{hex}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
