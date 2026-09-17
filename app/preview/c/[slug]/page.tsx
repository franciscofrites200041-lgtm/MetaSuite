import Link from "next/link";

const COMPANIES: Record<string, { name: string; slug: string; industry: string; meta: { ad_account: string } | null }> = {
  surmotors: { name: "Surmotors", slug: "surmotors", industry: "Automotriz — usados", meta: { ad_account: "act_1055887302" } },
  "cafe-bosco": { name: "Café Bosco", slug: "cafe-bosco", industry: "Gastronomía", meta: null },
};

const OBJECTIVES: Record<string, { id: string; title: string; status: "drafting" | "ready" | "launched" | "archived"; updated_at: string }[]> = {
  surmotors: [
    { id: "1", title: "Camioneta usada Q4 · CABA", status: "launched", updated_at: "2026-09-14T18:23:00" },
    { id: "2", title: "Fin de mes · promo autos km 0", status: "ready", updated_at: "2026-09-12T09:12:00" },
    { id: "3", title: "Test lookalikes clientes 2025", status: "drafting", updated_at: "2026-09-10T14:40:00" },
  ],
  "cafe-bosco": [
    { id: "10", title: "Apertura sucursal Palermo", status: "drafting", updated_at: "2026-09-15T20:00:00" },
  ],
};

export default async function PreviewCompany({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = COMPANIES[slug];
  if (!company) {
    return (
      <section className="max-w-[720px] mx-auto px-10 pt-16">
        <p style={{ color: "var(--color-ink-muted)" }}>Empresa demo no encontrada. Volvé al <Link href="/preview" className="underline">preview</Link>.</p>
      </section>
    );
  }
  const objectives = OBJECTIVES[slug] ?? [];

  return (
    <section className="max-w-[1080px] mx-auto px-10 pt-12 pb-24">
      <p className="mb-2 text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        Empresa
      </p>
      <div className="flex items-baseline justify-between mb-4">
        <div className="flex items-baseline gap-4">
          <h1
            className="text-[32px] leading-[1.1] tracking-tight"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
          >
            {company.name}
          </h1>
          <span className="text-[12px]" style={{ color: "var(--color-ink-subtle)" }}>Ajustes</span>
        </div>
        {company.meta ? (
          <div className="text-[12px] flex items-center gap-2" style={{ color: "var(--color-ink-muted)" }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-success)" }} />
            Meta · <span style={{ fontFamily: "var(--font-mono)" }}>{company.meta.ad_account}</span>
          </div>
        ) : (
          <span
            className="rounded-md px-3 py-1.5 text-[12px] font-medium"
            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
          >
            Conectar Meta Ads
          </span>
        )}
      </div>

      <div className="hairline rounded-lg" style={{ background: "var(--color-surface-1)" }}>
        <header className="flex items-center justify-between px-6 py-4 hairline-b">
          <h2 className="text-[15px] tracking-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
            Objetivos de pauta
          </h2>
          <span
            className="rounded-md px-3 py-1.5 text-[12px] font-medium"
            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
          >
            Nuevo objetivo
          </span>
        </header>
        {objectives.length > 0 ? (
          <ul>
            {objectives.map((o, idx) => (
              <li key={o.id} className={idx > 0 ? "hairline-t" : ""}>
                <Link
                  href={`/preview/c/${slug}/objectives/${o.id}`}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="min-w-0">
                    <div className="text-[14px] truncate">{o.title}</div>
                    <div
                      className="text-[11px] mt-0.5"
                      style={{ color: "var(--color-ink-subtle)", fontFamily: "var(--font-mono)" }}
                    >
                      {new Date(o.updated_at).toLocaleString("es-AR")}
                    </div>
                  </div>
                  <StatusPill status={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-10 text-center text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>
            Todavía no hay objetivos.
          </div>
        )}
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    drafting: { bg: "var(--color-surface-2)", fg: "var(--color-ink-muted)", label: "Borrador" },
    ready: { bg: "color-mix(in oklab, var(--color-info) 12%, transparent)", fg: "var(--color-info)", label: "Listo" },
    launched: { bg: "color-mix(in oklab, var(--color-success) 14%, transparent)", fg: "var(--color-success)", label: "En Meta" },
    archived: { bg: "var(--color-surface-2)", fg: "var(--color-ink-subtle)", label: "Archivado" },
  };
  const s = map[status] ?? map.drafting;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] tracking-wider uppercase"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}
