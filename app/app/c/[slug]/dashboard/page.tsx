import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import {
  fetchAccountInsights,
  fetchCampaignInsights,
  SAMPLE_ACCOUNT_INSIGHTS,
  SAMPLE_CAMPAIGN_INSIGHTS,
  SAMPLE_BUDGET_CHANGES,
  type AccountInsights,
  type CampaignInsight,
  type BudgetChangeRow,
} from "@/lib/meta/insights";
import { DashboardTour } from "@/components/dashboard-tour";

export const metadata = { title: "Dashboard — Toruk AUGUR" };

// Dashboard: KPIs across the account, table of campaigns, and a placeholder
// for the agent's budget reinvestment timeline (agent tools come next
// iteration). When the account has no data yet we render the same layout
// with realistic sample numbers + a banner explaining it's a preview.
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!company) notFound();

  const [account, campaigns, { data: budgetChangesRaw }] = await Promise.all([
    fetchAccountInsights(supabase, company.id, "last_30d"),
    fetchCampaignInsights(supabase, company.id, "last_30d"),
    supabase
      .from("campaign_budget_changes")
      .select("id, campaign_id, old_daily_budget_cents, new_daily_budget_cents, reason, changed_by, created_at, campaigns!inner(name, objective_id, objectives!inner(company_id))")
      .eq("campaigns.objectives.company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const budgetChanges: BudgetChangeRow[] = (budgetChangesRaw ?? []).map((r) => {
    const c = Array.isArray(r.campaigns) ? r.campaigns[0] : r.campaigns;
    return {
      id: r.id as string,
      campaign_name: (c?.name as string) ?? "campaña",
      old_cents: r.old_daily_budget_cents as number | null,
      new_cents: r.new_daily_budget_cents as number,
      reason: r.reason as string,
      by: r.changed_by as "agent" | "user",
      when: new Date(r.created_at as string),
    };
  });

  const hasRealData = !!account && account.spend > 0;
  const shownAccount: AccountInsights = hasRealData ? account : SAMPLE_ACCOUNT_INSIGHTS;
  const shownCampaigns: CampaignInsight[] = hasRealData ? campaigns : SAMPLE_CAMPAIGN_INSIGHTS;
  const shownBudgetChanges: BudgetChangeRow[] = hasRealData ? budgetChanges : SAMPLE_BUDGET_CHANGES;
  const currency = shownAccount.currency;

  return (
    <section className="max-w-[1180px] mx-auto px-10 pt-12 pb-24">
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <p className="mb-2 text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
            <Link href={`/app/c/${company.slug}`} style={{ color: "var(--color-ink-subtle)" }}>
              {company.name}
            </Link>
            <span className="mx-1.5">/</span>
            Dashboard
          </p>
          <h1
            className="text-[32px] leading-[1.1] tracking-tight"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
          >
            Métricas de pauta
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>
            Últimos 30 días · fuente Meta Ads Insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DashboardTour autoOpen={!hasRealData} />
          <Link
            href={`/app/c/${company.slug}`}
            className="text-[12px] hairline rounded-md px-3 py-1.5"
            style={{ background: "var(--color-surface-1)", color: "var(--color-ink-muted)" }}
          >
            ← Volver a la empresa
          </Link>
        </div>
      </div>

      {!hasRealData ? <PreviewBanner /> : null}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 mb-10">
        <Kpi tour="kpi-spend" label="Gasto" value={fmtMoney(shownAccount.spend, currency)} sub={`${currency}`} />
        <Kpi tour="kpi-impressions" label="Impresiones" value={fmtInt(shownAccount.impressions)} sub={shownAccount.reach ? `${fmtInt(shownAccount.reach)} personas` : undefined} />
        <Kpi tour="kpi-clicks" label="Clicks" value={fmtInt(shownAccount.clicks)} sub={`${shownAccount.ctr.toFixed(2)}% CTR`} />
        <Kpi tour="kpi-cost" label="CPC" value={fmtMoney(shownAccount.cpc, currency)} sub={`CPM ${fmtMoney(shownAccount.cpm, currency)}`} />
        <Kpi
          tour="kpi-conversions"
          label="Conversiones"
          value={shownAccount.conversions !== null ? fmtInt(shownAccount.conversions) : "—"}
          sub={shownAccount.cpa !== null ? `CPA ${fmtMoney(shownAccount.cpa, currency)}` : "requiere Pixel"}
          muted={shownAccount.conversions === null}
        />
      </div>

      <section className="mb-12">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[16px] tracking-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: "var(--color-primary)" }}>
            Campañas
          </h2>
          <p className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
            {shownCampaigns.length} activas
          </p>
        </div>
        <div data-tour="campaigns-table" className="hairline rounded-lg overflow-hidden" style={{ background: "var(--color-surface-1)" }}>
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: "var(--color-surface-2)" }}>
                <Th align="left">Campaña</Th>
                <Th>Estado</Th>
                <Th align="right">Gasto</Th>
                <Th align="right">Impresiones</Th>
                <Th align="right">Clicks</Th>
                <Th align="right">CTR</Th>
                <Th align="right">CPC</Th>
                <Th align="right">Conv.</Th>
              </tr>
            </thead>
            <tbody>
              {shownCampaigns.map((c) => (
                <tr key={c.campaign_id} className="hairline-t">
                  <Td align="left">
                    <span className="truncate block max-w-[320px]">{c.campaign_name}</span>
                  </Td>
                  <Td><StatusPill status={c.status} /></Td>
                  <Td align="right" mono>{fmtMoney(c.spend, currency)}</Td>
                  <Td align="right" mono>{fmtInt(c.impressions)}</Td>
                  <Td align="right" mono>{fmtInt(c.clicks)}</Td>
                  <Td align="right" mono>{c.ctr.toFixed(2)}%</Td>
                  <Td align="right" mono>{fmtMoney(c.cpc, currency)}</Td>
                  <Td align="right" mono>{c.conversions !== null ? fmtInt(c.conversions) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section data-tour="agent-activity">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[16px] tracking-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: "var(--color-primary)" }}>
            Actividad del agente
          </h2>
        </div>
        {shownBudgetChanges.length === 0 ? (
          <div className="hairline rounded-lg p-8 text-center" style={{ background: "var(--color-surface-1)" }}>
            <p className="text-[13px] mb-1" style={{ color: "var(--color-ink)" }}>
              El agente todavía no ha ajustado presupuestos.
            </p>
            <p className="text-[12px] max-w-[520px] mx-auto" style={{ color: "var(--color-ink-muted)" }}>
              Cuando el CPA de una campaña se desvíe de la meta, la IA va a mover presupuesto entre campañas. Cada movimiento va a aparecer acá con el motivo y la delta en pesos.
            </p>
          </div>
        ) : (
          <ol className="hairline rounded-lg divide-y" style={{ background: "var(--color-surface-1)", borderColor: "var(--color-hairline)" }}>
            {shownBudgetChanges.map((ch) => {
              const oldD = ch.old_cents !== null ? ch.old_cents / 100 : null;
              const newD = ch.new_cents / 100;
              const delta = oldD !== null ? newD - oldD : null;
              const up = delta !== null && delta > 0;
              return (
                <li key={ch.id} className="px-5 py-4 flex items-start gap-4" style={{ borderColor: "var(--color-hairline)" }}>
                  <div
                    className="shrink-0 h-7 min-w-[60px] rounded-md grid place-items-center text-[11px]"
                    style={{
                      background: delta === null ? "var(--color-surface-2)" : up
                        ? "color-mix(in oklab, var(--color-success) 14%, transparent)"
                        : "color-mix(in oklab, var(--color-warning) 14%, transparent)",
                      color: delta === null ? "var(--color-ink-muted)" : up ? "var(--color-success)" : "var(--color-warning)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {delta === null ? "nuevo" : `${up ? "+" : "−"}${fmtMoney(Math.abs(delta), currency)}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px]">
                      <span className="font-medium">{ch.campaign_name}</span>
                      <span style={{ color: "var(--color-ink-subtle)" }}>
                        {oldD !== null ? ` · ${fmtMoney(oldD, currency)} → ${fmtMoney(newD, currency)}/día` : ` · ${fmtMoney(newD, currency)}/día`}
                      </span>
                    </div>
                    <div className="text-[12px] mt-0.5" style={{ color: "var(--color-ink-muted)" }}>
                      {ch.reason}
                    </div>
                  </div>
                  <div className="shrink-0 text-[11px]" style={{ color: "var(--color-ink-subtle)", fontFamily: "var(--font-mono)" }}>
                    {ch.when.toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    <div className="text-right mt-0.5">{ch.by === "agent" ? "IA" : "vos"}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </section>
  );
}

function PreviewBanner() {
  return (
    <div
      className="mb-8 hairline rounded-lg px-4 py-3 flex items-start gap-3"
      style={{
        background: "color-mix(in oklab, var(--color-primary) 6%, var(--color-surface-1))",
        borderColor: "color-mix(in oklab, var(--color-primary) 30%, var(--color-hairline))",
      }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full mt-1.5 shrink-0"
        style={{ background: "var(--color-primary)" }}
      />
      <div>
        <div className="text-[13px]" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)", fontWeight: 500 }}>
          Vista previa con datos de ejemplo
        </div>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--color-ink-muted)" }}>
          Todavía no hay gasto reportado por Meta. Así se ve tu dashboard cuando las campañas empiezan a correr y a acumular impresiones — los números se reemplazan por los reales sin que hagas nada.
        </p>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  muted,
  tour,
}: {
  label: string;
  value: string;
  sub?: string;
  muted?: boolean;
  tour?: string;
}) {
  return (
    <div className="hairline rounded-lg p-4" style={{ background: "var(--color-surface-1)" }} data-tour={tour}>
      <div className="text-[10px] tracking-wider uppercase mb-2" style={{ color: "var(--color-ink-subtle)" }}>
        {label}
      </div>
      <div
        className="text-[24px] tracking-tight leading-none"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: muted ? "var(--color-ink-muted)" : "var(--color-ink)" }}
      >
        {value}
      </div>
      {sub ? (
        <div className="text-[11px] mt-1.5" style={{ color: "var(--color-ink-subtle)", fontFamily: "var(--font-mono)" }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function Th({ children, align = "center" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  return (
    <th
      className={`px-3 py-2.5 text-[10px] tracking-wider uppercase font-medium text-${align}`}
      style={{ color: "var(--color-ink-subtle)" }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "center",
  mono,
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  mono?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2.5 text-${align}`}
      style={mono ? { fontFamily: "var(--font-mono)" } : undefined}
    >
      {children}
    </td>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    published: { bg: "color-mix(in oklab, var(--color-success) 14%, transparent)", fg: "var(--color-success)", label: "Activa" },
    paused: { bg: "var(--color-surface-2)", fg: "var(--color-ink-muted)", label: "Pausada" },
    draft: { bg: "var(--color-surface-2)", fg: "var(--color-ink-subtle)", label: "Borrador" },
    unknown: { bg: "var(--color-surface-2)", fg: "var(--color-ink-subtle)", label: "—" },
  };
  const s = map[status] ?? map.unknown;
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] tracking-wider uppercase"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

const nfInt = new Intl.NumberFormat("es-AR");
function fmtInt(n: number): string {
  return nfInt.format(n);
}
function fmtMoney(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}
