import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata = { title: "Análisis — Toruk AUGUR" };

type Rec = { title: string; why: string; fix: string };

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, has_physical_location, website_url, google_maps_url, brief_general_md, brief_general_updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!company) notFound();

  const { data: a } = await supabase
    .from("company_analysis")
    .select("*")
    .eq("company_id", company.id)
    .maybeSingle();

  async function reanalyze() {
    "use server";
    const supa = await supabaseServer();
    const { data: c } = await supa.from("companies").select("id").eq("slug", slug).maybeSingle();
    if (!c) return;
    await supa.from("company_analysis").upsert({ company_id: c.id, status: "running", started_at: new Date().toISOString(), last_error: null });
    void import("@/lib/analysis/runner").then((m) => m.runCompanyAnalysis(c.id));
    revalidatePath(`/app/c/${slug}/analysis`);
    revalidatePath(`/app/c/${slug}`);
    redirect(`/app/c/${slug}/analysis`);
  }

  const seoRecs: Rec[] = Array.isArray(a?.seo_recommendations) ? (a?.seo_recommendations as Rec[]) : [];
  const geoRecs: Rec[] = Array.isArray(a?.geo_recommendations) ? (a?.geo_recommendations as Rec[]) : [];

  return (
    <section className="max-w-[900px] mx-auto px-10 pt-12 pb-24">
      <p className="mb-2 text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        <Link href={`/app/c/${company.slug}`} style={{ color: "var(--color-ink-subtle)" }}>{company.name}</Link>
        <span className="mx-1.5">/</span>
        Análisis
      </p>
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-[32px] leading-[1.1] tracking-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
          Análisis de la empresa
        </h1>
        <form action={reanalyze}>
          <SubmitButton size="sm" pendingLabel="Encolando…">Re-analizar</SubmitButton>
        </form>
      </div>

      <p className="mb-8 text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>
        Fuentes: <a href={company.website_url ?? "#"} target="_blank" rel="noopener" className="underline">{company.website_url}</a>
        {company.google_maps_url ? <> · <a href={company.google_maps_url} target="_blank" rel="noopener" className="underline">Google Maps</a></> : null}
      </p>

      {!a ? (
        <div className="hairline rounded-lg p-6 text-[13px]" style={{ background: "var(--color-surface-1)", color: "var(--color-ink-subtle)" }}>
          El análisis todavía no arrancó. Apretá "Re-analizar" para lanzarlo.
        </div>
      ) : (
        <>
          <Section title="Brief general" primary>
            {company.brief_general_md ? (
              <div className="chat-prose text-[14px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{company.brief_general_md}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>Aún no generado.</p>
            )}
          </Section>

          <Section title={`SEO · ${a.seo_score ?? "—"}/100`} primary>
            <p className="text-[14px] mb-5" style={{ color: "var(--color-ink)" }}>{a.seo_summary ?? "Sin resumen."}</p>
            <RecList recs={seoRecs} />
          </Section>

          {company.has_physical_location ? (
            <Section title={`GEO · ${a.geo_score ?? "—"}/100`} primary>
              <p className="text-[14px] mb-5" style={{ color: "var(--color-ink)" }}>{a.geo_summary ?? "Sin resumen."}</p>
              <RecList recs={geoRecs} />
            </Section>
          ) : null}
        </>
      )}
    </section>
  );
}

function Section({ title, children, primary }: { title: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-[16px] tracking-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: primary ? "var(--color-primary)" : "var(--color-ink)" }}>
        {title}
      </h2>
      <div className="hairline rounded-lg p-5" style={{ background: "var(--color-surface-1)" }}>
        {children}
      </div>
    </section>
  );
}

function RecList({ recs }: { recs: Rec[] }) {
  if (recs.length === 0) return <p className="text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>Sin recomendaciones específicas.</p>;
  return (
    <ol className="space-y-4">
      {recs.map((r, i) => (
        <li key={i} className="hairline rounded-md p-4" style={{ background: "var(--color-surface-2)" }}>
          <div className="flex items-baseline gap-3">
            <span className="text-[12px]" style={{ color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}>{String(i + 1).padStart(2, "0")}</span>
            <div className="flex-1">
              <div className="text-[14px] mb-1" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>{r.title}</div>
              <div className="text-[12.5px] mb-2" style={{ color: "var(--color-ink-muted)" }}>{r.why}</div>
              <div className="text-[12.5px]" style={{ color: "var(--color-ink)" }}>
                <span className="text-[10px] tracking-wider uppercase mr-2" style={{ color: "var(--color-primary)" }}>Fix</span>
                {r.fix}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
