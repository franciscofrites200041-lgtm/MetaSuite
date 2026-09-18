"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getMetaConnection, createAdCreative, createAd, createAdImage } from "@/lib/meta/graph";

export async function publishAdInMeta(formData: FormData) {
  const adId = String(formData.get("ad_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const campaignId = String(formData.get("campaign_id") ?? "");
  if (!adId) return;

  const supabase = await supabaseServer();

  const { data: ad } = await supabase
    .from("ads")
    .select("id, name, ad_set_id, creative_id, ad_sets!inner(meta_adset_id, campaigns!inner(objective_id, objectives!inner(company_id, publish_mode, companies!inner(website_url, name))))")
    .eq("id", adId)
    .maybeSingle<{
      id: string;
      name: string;
      ad_set_id: string;
      creative_id: string | null;
      ad_sets: {
        meta_adset_id: string | null;
        campaigns: {
          objective_id: string;
          objectives: {
            company_id: string;
            publish_mode: "auto" | "approval" | null;
            companies: { website_url: string | null; name: string };
          };
        };
      };
    }>();
  if (!ad) return failure(supabase, adId, "ad_not_found", slug, campaignId);
  if (!ad.creative_id) return failure(supabase, adId, "sin_creative", slug, campaignId);
  if (!ad.ad_sets.meta_adset_id) return failure(supabase, adId, "adset_no_publicado", slug, campaignId);

  const company = ad.ad_sets.campaigns.objectives.companies;
  const publishMode = ad.ad_sets.campaigns.objectives.publish_mode ?? "approval";
  const companyId = ad.ad_sets.campaigns.objectives.company_id;

  if (!company.website_url) return failure(supabase, adId, "falta_website_url_empresa", slug, campaignId);

  const { data: creative } = await supabase
    .from("ad_creatives")
    .select("id, copy_text, image_url, meta_image_hash")
    .eq("id", ad.creative_id)
    .maybeSingle();
  if (!creative) return failure(supabase, adId, "creative_not_found", slug, campaignId);
  if (!creative.image_url) return failure(supabase, adId, "creative_sin_imagen", slug, campaignId);

  const conn = await getMetaConnection(supabase, companyId);
  if (!conn) return failure(supabase, adId, "meta_no_conectado", slug, campaignId);
  if (!conn.page_id) return failure(supabase, adId, "sin_page_id", slug, campaignId);

  // Ensure image is registered on Meta.
  let hash = creative.meta_image_hash as string | null;
  if (!hash) {
    const res = await createAdImage(conn, creative.image_url);
    if (!res.ok) return failure(supabase, adId, `meta_image: ${res.error}`, slug, campaignId);
    hash = res.data.hash;
    await supabase.from("ad_creatives").update({ meta_image_hash: hash }).eq("id", ad.creative_id);
  }

  // Create the AdCreative in Meta.
  const metaCreative = await createAdCreative(conn, {
    name: `${ad.name} · creative`,
    page_id: conn.page_id,
    image_hash: hash!,
    message: creative.copy_text,
    link: company.website_url,
    call_to_action: "LEARN_MORE",
  });
  if (!metaCreative.ok) return failure(supabase, adId, `adcreative: ${metaCreative.error}`, slug, campaignId);

  // Create the Ad.
  const metaStatus = publishMode === "auto" ? "ACTIVE" : "PAUSED";
  const metaAd = await createAd(conn, {
    name: ad.name,
    adset_id: ad.ad_sets.meta_adset_id,
    creative_id: metaCreative.data.id,
    status: metaStatus,
  });
  if (!metaAd.ok) return failure(supabase, adId, `ad: ${metaAd.error}`, slug, campaignId);

  const dbStatus = publishMode === "auto" ? "published" : "pending_approval";
  await supabase
    .from("ads")
    .update({ meta_ad_id: metaAd.data.id, status: dbStatus, payload: { meta_creative_id: metaCreative.data.id } })
    .eq("id", adId);

  await supabase.from("ad_creatives").update({ status: "used" }).eq("id", ad.creative_id);

  revalidatePath(`/app/c/${slug}/campaigns/${campaignId}`);
}

async function failure(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  adId: string,
  error: string,
  slug: string,
  campaignId: string
) {
  await supabase.from("ads").update({ status: "error", payload: { error } }).eq("id", adId);
  revalidatePath(`/app/c/${slug}/campaigns/${campaignId}`);
}
