"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      // strip combining marks
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .slice(0, 40) || "empresa"
  );
}

export async function createCompany(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const websiteUrl = String(formData.get("website_url") ?? "").trim() || null;
  const mapsUrl = String(formData.get("google_maps_url") ?? "").trim() || null;
  const hasPhysical = formData.get("has_physical_location") === "on";
  const logoFile = formData.get("logo") as File | null;
  if (!name) redirect("/app/companies/new?error=nombre");
  if (!websiteUrl) redirect("/app/companies/new?error=website_requerido");

  const supabase = await supabaseServer();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) redirect("/login");

  const { data: memberships } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", user.user.id)
    .limit(1);
  if (!memberships || memberships.length === 0) {
    redirect("/app/companies/new?error=no_account");
  }
  const accountId = memberships[0].account_id;

  const baseSlug = slugify(name);
  let slug = baseSlug;
  for (let i = 2; i < 20; i++) {
    const { data: exists } = await supabase
      .from("companies")
      .select("id")
      .eq("account_id", accountId)
      .eq("slug", slug)
      .maybeSingle();
    if (!exists) break;
    slug = `${baseSlug}-${i}`;
  }

  const insertPayload: Record<string, string | boolean | null> = {
    account_id: accountId,
    name,
    slug,
    industry,
    description,
    website_url: websiteUrl,
    google_maps_url: mapsUrl,
    has_physical_location: hasPhysical,
  };

  const { data: created, error } = await supabase
    .from("companies")
    .insert(insertPayload)
    .select("id, slug")
    .single();
  if (error || !created) {
    redirect(`/app/companies/new?error=${encodeURIComponent(error?.message ?? "insert_failed")}`);
  }

  // Optional logo upload post-insert (needs company id for the storage key).
  if (logoFile && logoFile.size > 0) {
    if (logoFile.size <= 4 * 1024 * 1024) {
      const ext = (logoFile.name.split(".").pop() ?? "png").toLowerCase().slice(0, 5);
      const key = `${created!.id}/${Date.now()}.${ext}`;
      const admin = supabaseAdmin();
      const bytes = new Uint8Array(await logoFile.arrayBuffer());
      const { error: upErr } = await admin.storage.from("company-logos").upload(key, bytes, {
        contentType: logoFile.type || "image/png",
        upsert: true,
      });
      if (!upErr) {
        const { data: publicUrl } = admin.storage.from("company-logos").getPublicUrl(key);
        await supabase.from("companies").update({ logo_url: publicUrl.publicUrl }).eq("id", created!.id);
      }
    }
  }

  // Seed the analysis row so the company page can render "Analizando…"
  // instantly and start polling. Actual pipeline fires in the background.
  await supabase.from("company_analysis").insert({ company_id: created!.id, status: "pending" });

  // Fire-and-forget the analysis. Using void + import here so the redirect
  // below happens instantly and the LLM/scraper work continues in the
  // request-serving function. Vercel Functions keep running after the
  // response is sent, up to the function timeout.
  // ponytail: fire-and-forget in the same function; move to a queue if we
  // ever need survivability across cold starts.
  void import("@/lib/analysis/runner").then((m) => m.runCompanyAnalysis(created!.id));

  revalidatePath("/app");
  redirect(`/app/c/${created!.slug}`);
}

export async function createObjective(formData: FormData) {
  const companySlug = String(formData.get("company_slug") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const briefMd = String(formData.get("brief_md") ?? "");
  if (!title || !companySlug) redirect(`/app/c/${companySlug}?error=titulo`);

  const supabase = await supabaseServer();
  const { data: company } = await supabase
    .from("companies")
    .select("id, slug")
    .eq("slug", companySlug)
    .maybeSingle();
  if (!company) redirect(`/app?error=empresa`);

  const { data: obj, error } = await supabase
    .from("objectives")
    .insert({ company_id: company.id, title, brief_md: briefMd })
    .select("id")
    .single();
  if (error || !obj) {
    redirect(`/app/c/${companySlug}/objectives/new?error=${encodeURIComponent(error?.message ?? "insert_failed")}`);
  }

  await supabase.from("chat_threads").insert({ objective_id: obj!.id });

  revalidatePath(`/app/c/${company.slug}`);
  redirect(`/app/c/${company.slug}/objectives/${obj!.id}`);
}
