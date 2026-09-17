"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

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
  if (!name) redirect("/app/companies/new?error=nombre");

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

  const { data: created, error } = await supabase
    .from("companies")
    .insert({ account_id: accountId, name, slug, industry, description })
    .select("slug")
    .single();
  if (error || !created) {
    redirect(`/app/companies/new?error=${encodeURIComponent(error?.message ?? "insert_failed")}`);
  }

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
