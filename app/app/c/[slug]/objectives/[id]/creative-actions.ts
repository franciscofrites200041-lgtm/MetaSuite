"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMetaConnection, createAdImage } from "@/lib/meta/graph";

export async function uploadCreativeImage(formData: FormData) {
  const creativeId = String(formData.get("creative_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const objectiveId = String(formData.get("objective_id") ?? "");
  const file = formData.get("image") as File | null;
  if (!creativeId || !file || file.size === 0) return;
  if (file.size > 8 * 1024 * 1024) {
    revalidatePath(`/app/c/${slug}/objectives/${objectiveId}`);
    return;
  }

  const supabase = await supabaseServer();
  const { data: creative } = await supabase
    .from("ad_creatives")
    .select("id, objective_id, objectives!inner(company_id)")
    .eq("id", creativeId)
    .maybeSingle<{ id: string; objective_id: string; objectives: { company_id: string } | { company_id: string }[] }>();
  if (!creative) return;
  const companyId = Array.isArray(creative.objectives) ? creative.objectives[0].company_id : creative.objectives.company_id;

  const ext = (file.name.split(".").pop() ?? "png").toLowerCase().slice(0, 5);
  const key = `${companyId}/${creativeId}-${Date.now()}.${ext}`;
  const admin = supabaseAdmin();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await admin.storage.from("creative-media").upload(key, bytes, {
    contentType: file.type || "image/png",
    upsert: true,
  });
  if (upErr) return;
  const { data: publicUrl } = admin.storage.from("creative-media").getPublicUrl(key);
  const imageUrl = publicUrl.publicUrl;

  // Try to register the image on Meta right away so publishing is one click.
  let hash: string | null = null;
  const conn = await getMetaConnection(supabase, companyId);
  if (conn) {
    const res = await createAdImage(conn, imageUrl);
    if (res.ok) hash = res.data.hash;
  }

  await supabase
    .from("ad_creatives")
    .update({ image_url: imageUrl, meta_image_hash: hash, status: "approved" })
    .eq("id", creativeId);

  revalidatePath(`/app/c/${slug}/objectives/${objectiveId}`);
}
