import type { SupabaseClient } from "@supabase/supabase-js";
import { getMetaConnection } from "./graph";

// Meta Ads Insights fetch. All numbers arrive as strings from the Graph
// API — we coerce to number here so the UI never has to think about it.
// "purchase" is the canonical conversion action Meta reports when a Pixel
// or Conversions API is wired up; if the advertiser hasn't set that up
// we simply return null and the UI hides the conversion card.

const GRAPH = "https://graph.facebook.com/v21.0";

export type DatePreset =
  | "today"
  | "yesterday"
  | "last_7d"
  | "last_14d"
  | "last_30d"
  | "last_90d"
  | "lifetime";

export type AccountInsights = {
  spend: number;
  currency: string;
  impressions: number;
  reach: number | null;
  clicks: number;
  ctr: number;    // percent
  cpc: number;
  cpm: number;
  conversions: number | null;
  cpa: number | null;
};

export type CampaignInsight = {
  campaign_id: string;
  campaign_name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number | null;
};

type Action = { action_type: string; value: string };
type InsightRow = {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: Action[];
  account_currency?: string;
  campaign_id?: string;
  campaign_name?: string;
};

function purchases(row: InsightRow): number | null {
  const p = row.actions?.find((a) => a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase");
  if (!p) return null;
  const n = parseInt(p.value, 10);
  return Number.isFinite(n) ? n : null;
}

/** Account-level totals for a preset window. Returns null if Meta isn't
 *  connected or the API refuses (e.g. token expired). */
export async function fetchAccountInsights(
  supabase: SupabaseClient,
  companyId: string,
  datePreset: DatePreset = "last_30d"
): Promise<AccountInsights | null> {
  const conn = await getMetaConnection(supabase, companyId);
  if (!conn) return null;
  const url = new URL(`${GRAPH}/act_${conn.ad_account_id}/insights`);
  url.searchParams.set("fields", "spend,impressions,reach,clicks,ctr,cpc,cpm,actions,account_currency");
  url.searchParams.set("date_preset", datePreset);
  url.searchParams.set("level", "account");
  url.searchParams.set("access_token", conn.access_token);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: InsightRow[] };
  const row = json.data?.[0];
  if (!row) return null;
  const conv = purchases(row);
  const spend = parseFloat(row.spend ?? "0");
  return {
    spend,
    currency: row.account_currency ?? "USD",
    impressions: parseInt(row.impressions ?? "0", 10),
    reach: row.reach ? parseInt(row.reach, 10) : null,
    clicks: parseInt(row.clicks ?? "0", 10),
    ctr: parseFloat(row.ctr ?? "0"),
    cpc: parseFloat(row.cpc ?? "0"),
    cpm: parseFloat(row.cpm ?? "0"),
    conversions: conv,
    cpa: conv && spend > 0 ? spend / conv : null,
  };
}

/** Per-campaign breakdown for the same window. */
export async function fetchCampaignInsights(
  supabase: SupabaseClient,
  companyId: string,
  datePreset: DatePreset = "last_30d"
): Promise<CampaignInsight[]> {
  const conn = await getMetaConnection(supabase, companyId);
  if (!conn) return [];
  const url = new URL(`${GRAPH}/act_${conn.ad_account_id}/insights`);
  url.searchParams.set("fields", "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions");
  url.searchParams.set("date_preset", datePreset);
  url.searchParams.set("level", "campaign");
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", conn.access_token);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: InsightRow[] };
  const rows = json.data ?? [];

  // Cross-reference status from our own campaigns table so the UI shows the
  // status we manage, not just what Meta's insights returned.
  const { data: dbRows } = await supabase
    .from("campaigns")
    .select("meta_campaign_id, status");
  const statusById = new Map<string, string>();
  for (const r of dbRows ?? []) if (r.meta_campaign_id) statusById.set(r.meta_campaign_id, r.status);

  return rows.map((r) => ({
    campaign_id: r.campaign_id ?? "",
    campaign_name: r.campaign_name ?? "",
    status: statusById.get(r.campaign_id ?? "") ?? "unknown",
    spend: parseFloat(r.spend ?? "0"),
    impressions: parseInt(r.impressions ?? "0", 10),
    clicks: parseInt(r.clicks ?? "0", 10),
    ctr: parseFloat(r.ctr ?? "0"),
    cpc: parseFloat(r.cpc ?? "0"),
    conversions: purchases(r),
  }));
}

/** Sample data used when the empty state renders. Realistic numbers so the
 *  advertiser sees what a healthy dashboard looks like once data flows. */
export const SAMPLE_ACCOUNT_INSIGHTS: AccountInsights = {
  spend: 487.32,
  currency: "USD",
  impressions: 42156,
  reach: 28432,
  clicks: 987,
  ctr: 2.34,
  cpc: 0.49,
  cpm: 11.56,
  conversions: 23,
  cpa: 21.19,
};

export const SAMPLE_CAMPAIGN_INSIGHTS: CampaignInsight[] = [
  {
    campaign_id: "sample_1",
    campaign_name: "AUGUR · Vender más zapatos verano",
    status: "published",
    spend: 267.10,
    impressions: 22100,
    clicks: 542,
    ctr: 2.45,
    cpc: 0.49,
    conversions: 14,
  },
  {
    campaign_id: "sample_2",
    campaign_name: "AUGUR · Leads showroom",
    status: "published",
    spend: 220.22,
    impressions: 20056,
    clicks: 445,
    ctr: 2.23,
    cpc: 0.50,
    conversions: 9,
  },
];

// Sample activity for the "Actividad del agente" panel when there's no data
// yet. Same shape as the real query result on page.tsx so the row renderer
// can stay identical.
export type BudgetChangeRow = {
  id: string;
  campaign_name: string;
  old_cents: number | null;
  new_cents: number;
  reason: string;
  by: "agent" | "user";
  when: Date;
};

const HOUR = 3600 * 1000;
export const SAMPLE_BUDGET_CHANGES: BudgetChangeRow[] = [
  {
    id: "sbc-1",
    campaign_name: "AUGUR · Leads showroom",
    old_cents: 1500,
    new_cents: 2500,
    reason:
      "CTR sostenido en 2.8% y CPA en $8.10 (meta $12). Le muevo $10/día desde 'Vender zapatos', que viene con CPA $28.",
    by: "agent",
    when: new Date(Date.now() - 2 * HOUR),
  },
  {
    id: "sbc-2",
    campaign_name: "AUGUR · Vender más zapatos verano",
    old_cents: 2500,
    new_cents: 1500,
    reason:
      "Bajo el diario $10 hasta ver si el CPA baja de $28. Si en 48h no mejora, la pauso.",
    by: "agent",
    when: new Date(Date.now() - 2 * HOUR - 12 * 60 * 1000),
  },
  {
    id: "sbc-3",
    campaign_name: "AUGUR · Leads showroom",
    old_cents: null,
    new_cents: 1500,
    reason:
      "Campaña recién publicada con $15/día inicial. Mismo presupuesto que aprobaste en el chat.",
    by: "agent",
    when: new Date(Date.now() - 26 * HOUR),
  },
];
