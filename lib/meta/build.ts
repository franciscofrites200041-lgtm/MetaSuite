import type { SupabaseClient } from "@supabase/supabase-js";
import { createCampaign, createAdSet, getMetaConnection } from "@/lib/meta/graph";

export type BuildCampaignInput = {
  objectiveId: string;
  companyId: string;
  campaign_name: string;
  objective_type:
    | "OUTCOME_LEADS"
    | "OUTCOME_SALES"
    | "OUTCOME_TRAFFIC"
    | "OUTCOME_ENGAGEMENT"
    | "OUTCOME_AWARENESS"
    | "OUTCOME_APP_PROMOTION";
  daily_budget_cents: number;
  ad_set_name: string;
  targeting: Record<string, unknown>;
  ads: Array<{ creative_id: string; name: string }>;
};

// Reasonable defaults per Meta objective. See:
// https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group
const OPTIMIZATION_BY_OBJECTIVE: Record<BuildCampaignInput["objective_type"], { optimization_goal: string; billing_event: string }> = {
  OUTCOME_LEADS: { optimization_goal: "LEAD_GENERATION", billing_event: "IMPRESSIONS" },
  OUTCOME_SALES: { optimization_goal: "OFFSITE_CONVERSIONS", billing_event: "IMPRESSIONS" },
  OUTCOME_TRAFFIC: { optimization_goal: "LINK_CLICKS", billing_event: "IMPRESSIONS" },
  OUTCOME_ENGAGEMENT: { optimization_goal: "POST_ENGAGEMENT", billing_event: "IMPRESSIONS" },
  OUTCOME_AWARENESS: { optimization_goal: "REACH", billing_event: "IMPRESSIONS" },
  OUTCOME_APP_PROMOTION: { optimization_goal: "APP_INSTALLS", billing_event: "IMPRESSIONS" },
};

/**
 * Builds a campaign in Meta (campaign + ad set) and mirrors it in the DB.
 *
 * ponytail: creates campaign + ad set in Meta, but leaves ads as DB drafts.
 * Ad creation in Meta needs image_hash / ig_media / video_id which requires the
 * media upload flow — deferred until logos / creatives get real assets.
 */
export async function buildCampaignInMeta(supabase: SupabaseClient, input: BuildCampaignInput) {
  const { data: obj } = await supabase
    .from("objectives")
    .select("publish_mode, company_id, title, companies!inner(account_id)")
    .eq("id", input.objectiveId)
    .maybeSingle();
  if (!obj) return { ok: false as const, error: "objective_not_found" };

  const { data: account } = await supabase
    .from("accounts")
    .select("default_publish_mode")
    .eq("id", (obj as { companies: { account_id: string } }).companies.account_id)
    .maybeSingle();
  const publishMode: "auto" | "approval" =
    (obj as { publish_mode: "auto" | "approval" | null }).publish_mode ?? account?.default_publish_mode ?? "approval";
  const metaStatus = publishMode === "auto" ? "ACTIVE" : "PAUSED";

  const conn = await getMetaConnection(supabase, input.companyId);
  if (!conn) return { ok: false as const, error: "meta_not_connected" };

  const prefixed = `AUGUR · ${input.campaign_name}`;

  // 1. Campaign in Meta
  const camp = await createCampaign(conn, { name: prefixed, objective: input.objective_type, status: metaStatus });
  if (!camp.ok) return { ok: false as const, error: `campaign: ${camp.error}` };

  // 2. Ad set in Meta
  const opt = OPTIMIZATION_BY_OBJECTIVE[input.objective_type];
  const adset = await createAdSet(conn, {
    name: `${prefixed} · ${input.ad_set_name}`,
    campaign_id: camp.data.id,
    daily_budget_cents: input.daily_budget_cents,
    targeting: input.targeting,
    status: metaStatus,
    optimization_goal: opt.optimization_goal,
    billing_event: opt.billing_event,
  });
  if (!adset.ok) return { ok: false as const, error: `ad_set: ${adset.error}` };

  // 3. Mirror in DB
  const { data: dbCamp } = await supabase
    .from("campaigns")
    .insert({
      objective_id: input.objectiveId,
      meta_campaign_id: camp.data.id,
      name: prefixed,
      status: publishMode === "auto" ? "published" : "pending_approval",
      payload: { objective_type: input.objective_type },
    })
    .select("id")
    .single();
  if (!dbCamp) return { ok: false as const, error: "db_campaign_mirror_failed" };

  const { data: dbAdset } = await supabase
    .from("ad_sets")
    .insert({
      campaign_id: dbCamp.id,
      meta_adset_id: adset.data.id,
      name: `${prefixed} · ${input.ad_set_name}`,
      status: publishMode === "auto" ? "published" : "pending_approval",
      payload: { targeting: input.targeting, daily_budget_cents: input.daily_budget_cents, ...opt },
    })
    .select("id")
    .single();
  if (!dbAdset) return { ok: false as const, error: "db_adset_mirror_failed" };

  // 4. Ads: create DB drafts pointing to the ad set. Meta ad creation is
  // deferred until media upload exists (see ponytail comment).
  const adInserts = input.ads.map((a) => ({
    ad_set_id: dbAdset.id,
    creative_id: a.creative_id,
    name: `${prefixed} · ${a.name}`,
    status: "draft" as const,
    payload: {},
  }));
  const { data: insertedAds } = await supabase.from("ads").insert(adInserts).select("id");

  return {
    ok: true as const,
    campaign_id: dbCamp.id,
    meta_campaign_id: camp.data.id,
    ad_set_id: dbAdset.id,
    meta_adset_id: adset.data.id,
    ad_ids: (insertedAds ?? []).map((a: { id: string }) => a.id),
    publish_mode: publishMode,
    note:
      publishMode === "approval"
        ? "Campaña y ad set creados en Meta (PAUSADOS). Aprobá desde la vista de campaña para activarlos."
        : "Campaña y ad set creados en Meta y ACTIVOS. Los ads quedan en borrador hasta que subas la imagen.",
  };
}
