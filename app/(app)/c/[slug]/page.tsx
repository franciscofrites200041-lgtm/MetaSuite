import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function CompanyDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, industry, description")
    .eq("slug", slug)
    .maybeSingle();
  if (!company) notFound();

  const [{ data: metaConn }, { data: objectives }] = await Promise.all([
    supabase.from("meta_connections").select("id, meta_ad_account_id, status").eq("company_id", company.id).maybeSingle(),
    supabase
      .from("objectives")
      .select("id, title, status, updated_at")
      .eq("company_id", company.id)
      .order("updated_at", { ascending: false }),
  ]);

  return (
    <section className="max-w-[1080px] mx-auto px-10 pt-12 pb-24">
      <p className="mb-2 text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        Empresa
      </p>
      <div className="flex items-baseline justify-between mb-8">
        <h1
          className="text-[32px] leading-[1.1] tracking-tight"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          {company.name}
        </h1>
        <MetaBadge status={metaConn?.status ?? null} adAccount={metaConn?.meta_ad_account_id ?? null} />
      </div>

      {/* Objetivos */}
      <div className="hairline rounded-lg" style={{ background: "var(--color-surface-1)" }}>
        <header className="flex items-center justify-between px-6 py-4 hairline-b">
          <h2 className="text-[15px] tracking-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
            Objetivos de pauta
          </h2>
          <Link
            href={`/app/c/${company.slug}/objectives/new`}
            className="rounded-md px-3 py-1.5 text-[12px] font-medium"
            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
          >
            Nuevo objetivo
          </Link>
        </header>
        {objectives && objectives.length > 0 ? (
          <ul>
            {objectives.map((o, idx) => (
              <li key={o.id} className={idx > 0 ? "hairline-t" : ""}>
                <Link
                  href={`/app/c/${company.slug}/objectives/${o.id}`}
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
            Todavía no hay objetivos. Creá el primero para empezar a charlar con la IA.
          </div>
        )}
      </div>
    </section>
  );
}

function MetaBadge({ status, adAccount }: { status: string | null; adAccount: string | null }) {
  if (!status) {
    return (
      <button
        type="button"
        className="hairline rounded-md px-3 py-1.5 text-[12px]"
        style={{ background: "var(--color-surface-2)", color: "var(--color-ink-muted)" }}
        disabled
        title="Meta OAuth se cablea en la próxima sesión"
      >
        Conectar Meta Ads
      </button>
    );
  }
  const color =
    status === "active" ? "var(--color-success)" : status === "expired" ? "var(--color-warning)" : "var(--color-danger)";
  return (
    <div className="text-[12px] flex items-center gap-2" style={{ color: "var(--color-ink-muted)" }}>
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      Meta · <span style={{ fontFamily: "var(--font-mono)" }}>{adAccount}</span>
    </div>
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
