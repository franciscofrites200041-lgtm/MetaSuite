import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import {
  fetchAccountInsights,
  fetchCampaignInsights,
  SAMPLE_ACCOUNT_INSIGHTS,
  SAMPLE_CAMPAIGN_INSIGHTS,
  type AccountInsights,
  type CampaignInsight,
} from "@/lib/meta/insights";

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
  const budgetChanges = (budgetChangesRaw ?? []).map((r) => {
    const c = Array.isArray(r.campaigns) ? r.campaigns[0] : r.campaigns;
    return {
      id: r.id as string,
      campaign_name: (c?.name as string) ?? "campaña",
      old_cents: r.old_daily_budget_cents as number | null,
      new_cents: r.new_daily_budget_cents as number,
      reason: r.reason as string,
      by: r.changed_by as string,
      when: new Date(r.created_at as string),
    };
  });

  const hasRealData = !!account && account.spend > 0;
  const shownAccount: AccountInsights = hasRealData ? account : SAMPLE_ACCOUNT_INSIGHTS;
  const shownCampaigns: CampaignInsight[] = hasRealData ? campaigns : SAMPLE_CAMPAIGN_INSIGHTS;
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
        <Link
          href={`/app/c/${company.slug}`}
          className="text-[12px] hairline rounded-md px-3 py-1.5"
          style={{ background: "var(--color-surface-1)", color: "var(--color-ink-muted)" }}
        >
          ← Volver a la empresa
        </Link>
      </div>

      {!hasRealData ? <PreviewBanner /> : null}
      {!hasRealData ? <HowToRead currency={currency} /> : null}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 mb-10">
        <Kpi label="Gasto" value={fmtMoney(shownAccount.spend, currency)} sub={`${currency}`} />
        <Kpi label="Impresiones" value={fmtInt(shownAccount.impressions)} sub={shownAccount.reach ? `${fmtInt(shownAccount.reach)} personas` : undefined} />
        <Kpi label="Clicks" value={fmtInt(shownAccount.clicks)} sub={`${shownAccount.ctr.toFixed(2)}% CTR`} />
        <Kpi label="CPC" value={fmtMoney(shownAccount.cpc, currency)} sub={`CPM ${fmtMoney(shownAccount.cpm, currency)}`} />
        <Kpi
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
        <div className="hairline rounded-lg overflow-hidden" style={{ background: "var(--color-surface-1)" }}>
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

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[16px] tracking-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: "var(--color-primary)" }}>
            Actividad del agente
          </h2>
        </div>
        {budgetChanges.length === 0 ? (
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
            {budgetChanges.map((ch) => {
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

function HowToRead({ currency }: { currency: string }) {
  const money = (n: number) => fmtMoney(n, currency);
  const kpis: Array<[string, string]> = [
    ["Gasto", "Cuánta plata ya se debitó del ad account. Es el total invertido en el período."],
    ["Impresiones", "Cantidad de veces que un anuncio apareció en pantalla. Una misma persona puede sumar varias impresiones."],
    ["Reach", "Personas únicas que vieron al menos un anuncio. Reach < impresiones porque los mismos ojos miran varias veces."],
    ["Clicks", "Cuántas veces alguien clickeó un anuncio."],
    ["CTR (Click-through rate)", "Porcentaje de impresiones que se convirtieron en click. Arriba de 1.5% ya se considera sano; menos suele indicar que la creativa no engancha."],
    ["CPC (Costo por click)", "Cuánto pagás en promedio por cada click. Cuanto más bajo mejor, pero un CPC bajo con CTR bajísimo también es humo."],
    ["CPM (Costo por mil impresiones)", "Precio de comprar 1000 impresiones. Sirve para comparar qué tan caro es tu público objetivo."],
    ["Conversiones", `Gente que hizo la acción que buscás (comprar, dejar el mail, agendar). Requiere Pixel o Conversions API configurados en tu sitio.`],
    ["CPA (Costo por adquisición)", `Cuánto te cuesta cada conversión. Es EL número que decide si la campaña cierra: si vender el producto te deja ${money(15)} pero el CPA es ${money(30)}, estás perdiendo plata.`],
  ];
  return (
    <div className="mb-10 hairline rounded-lg p-6" style={{ background: "var(--color-surface-1)" }}>
      <div className="mb-1 text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        Guía rápida
      </div>
      <h2 className="mb-6 text-[20px] tracking-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "-0.01em" }}>
        Cómo leer este dashboard
      </h2>

      <h3 className="text-[13px] mb-3" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)", fontWeight: 500 }}>
        Las métricas de arriba
      </h3>
      <dl className="grid md:grid-cols-2 gap-x-8 gap-y-3 mb-8">
        {kpis.map(([label, def]) => (
          <div key={label}>
            <dt className="text-[13px]" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>{label}</dt>
            <dd className="text-[12px] mt-0.5" style={{ color: "var(--color-ink-muted)" }}>{def}</dd>
          </div>
        ))}
      </dl>

      <h3 className="text-[13px] mb-2" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)", fontWeight: 500 }}>
        La tabla de campañas
      </h3>
      <p className="text-[12px] mb-6" style={{ color: "var(--color-ink-muted)" }}>
        Un renglón por cada campaña que armaste en Meta. La misma info que arriba, pero desagregada por campaña — así se ve qué anda y qué no.
        Si tenés 3 campañas activas y una tiene CTR 3.2% pero otra 0.4%, esa segunda hay que rehacerla o pausarla.
      </p>

      <h3 className="text-[13px] mb-2" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)", fontWeight: 500 }}>
        Actividad del agente
      </h3>
      <p className="text-[12px]" style={{ color: "var(--color-ink-muted)" }}>
        Cuando le des permiso a la IA para ajustar presupuestos, cada movimiento queda registrado acá abajo con el motivo. Ej.: “Movió {money(8)}/día de Campaña A a Campaña B — CPA de A es 3× el de B”.
        Vos ves qué hizo, cuándo y por qué, y podés revertir si no estás de acuerdo.
      </p>
    </div>
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
}: {
  label: string;
  value: string;
  sub?: string;
  muted?: boolean;
}) {
  return (
    <div className="hairline rounded-lg p-4" style={{ background: "var(--color-surface-1)" }}>
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
