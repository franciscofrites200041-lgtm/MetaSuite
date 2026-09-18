import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function CompanySettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await supabaseServer();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, industry, description, logo_url, website_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!company) notFound();

  async function updateCompany(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const industry = String(formData.get("industry") ?? "").trim() || null;
    const description = String(formData.get("description") ?? "").trim() || null;
    const websiteUrl = String(formData.get("website_url") ?? "").trim() || null;
    const logoFile = formData.get("logo") as File | null;

    const supa = await supabaseServer();
    const { data: comp } = await supa.from("companies").select("id").eq("slug", slug).maybeSingle();
    if (!comp) redirect(`/app/c/${slug}/settings?error=not_found`);

    const patch: Record<string, string | null> = { name, industry, description, website_url: websiteUrl };

    if (logoFile && logoFile.size > 0) {
      if (logoFile.size > 4 * 1024 * 1024) {
        redirect(`/app/c/${slug}/settings?error=${encodeURIComponent("Logo mayor a 4MB.")}`);
      }
      const ext = (logoFile.name.split(".").pop() ?? "png").toLowerCase().slice(0, 5);
      const key = `${comp!.id}/${Date.now()}.${ext}`;
      const admin = supabaseAdmin();
      const bytes = new Uint8Array(await logoFile.arrayBuffer());
      const { error: upErr } = await admin.storage.from("company-logos").upload(key, bytes, {
        contentType: logoFile.type || "image/png",
        upsert: true,
      });
      if (upErr) redirect(`/app/c/${slug}/settings?error=${encodeURIComponent(upErr.message)}`);
      const { data: publicUrl } = admin.storage.from("company-logos").getPublicUrl(key);
      patch.logo_url = publicUrl.publicUrl;
    }

    const { error } = await supa.from("companies").update(patch).eq("id", comp!.id);
    if (error) redirect(`/app/c/${slug}/settings?error=${encodeURIComponent(error.message)}`);
    revalidatePath(`/app/c/${slug}/settings`);
    revalidatePath(`/app/c/${slug}`);
    redirect(`/app/c/${slug}/settings?saved=1`);
  }

  return (
    <section className="max-w-[720px] mx-auto px-10 pt-12 pb-24">
      <div className="mb-6 flex items-center gap-2 text-[12px]" style={{ color: "var(--color-ink-subtle)" }}>
        <Link href={`/app/c/${company.slug}`}>{company.name}</Link>
        <span>/</span>
        <span>Ajustes</span>
      </div>

      <h1
        className="text-[28px] leading-[1.1] tracking-tight mb-8"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
      >
        Ajustes de empresa
      </h1>

      {sp.error ? (
        <div className="mb-6 hairline rounded-md px-4 py-3 text-[13px]" style={{ background: "color-mix(in oklab, var(--color-danger) 8%, var(--color-surface-1))", color: "var(--color-danger)" }}>
          {sp.error}
        </div>
      ) : sp.saved ? (
        <div className="mb-6 hairline rounded-md px-4 py-3 text-[13px]" style={{ background: "color-mix(in oklab, var(--color-success) 8%, var(--color-surface-1))", color: "var(--color-success)" }}>
          Cambios guardados.
        </div>
      ) : null}

      <form action={updateCompany} className="flex flex-col gap-5" encType="multipart/form-data">
        {company.logo_url ? (
          <div className="flex items-center gap-4 hairline rounded-md p-3" style={{ background: "var(--color-surface-1)" }}>
            <Image
              src={company.logo_url}
              alt={`Logo de ${company.name}`}
              width={64}
              height={64}
              className="rounded-md object-cover"
              unoptimized
            />
            <span className="text-[12px]" style={{ color: "var(--color-ink-subtle)" }}>
              Logo actual · subí uno nuevo para reemplazarlo.
            </span>
          </div>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px]" style={{ color: "var(--color-ink-muted)" }}>Nombre</span>
          <input
            name="name"
            type="text"
            defaultValue={company.name}
            required
            className="hairline rounded-md px-3 py-2.5 text-[14px] outline-none"
            style={{ background: "var(--color-surface-2)" }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px]" style={{ color: "var(--color-ink-muted)" }}>Industria</span>
          <input
            name="industry"
            type="text"
            defaultValue={company.industry ?? ""}
            className="hairline rounded-md px-3 py-2.5 text-[14px] outline-none"
            style={{ background: "var(--color-surface-2)" }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px]" style={{ color: "var(--color-ink-muted)" }}>Descripción</span>
          <textarea
            name="description"
            defaultValue={company.description ?? ""}
            rows={4}
            className="hairline rounded-md px-3 py-2.5 text-[14px] outline-none resize-y"
            style={{ background: "var(--color-surface-2)" }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px]" style={{ color: "var(--color-ink-muted)" }}>Sitio web</span>
          <input
            name="website_url"
            type="url"
            placeholder="https://tu-sitio.com"
            defaultValue={company.website_url ?? ""}
            className="hairline rounded-md px-3 py-2.5 text-[14px] outline-none"
            style={{ background: "var(--color-surface-2)" }}
          />
          <span className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
            Obligatorio para publicar ads reales — Meta lo usa como landing en cada anuncio.
          </span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px]" style={{ color: "var(--color-ink-muted)" }}>Logo</span>
          <input
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="text-[13px] file:hairline file:rounded-md file:px-3 file:py-1.5 file:text-[12px] file:mr-3 file:bg-[color:var(--color-surface-2)]"
          />
          <span className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
            PNG, JPG, SVG o WEBP. Máx. 4MB.
          </span>
        </label>

        <button
          type="submit"
          className="mt-2 self-start rounded-md px-4 py-2.5 text-[13px] font-medium"
          style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
        >
          Guardar cambios
        </button>
      </form>

      <div className="mt-16 hairline-t pt-8">
        <h2 className="text-[16px] tracking-tight mb-2" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
          Conexión Meta Ads
        </h2>
        <p className="text-[13px] mb-3" style={{ color: "var(--color-ink-muted)" }}>
          Volvé a la vista principal de la empresa para conectar/reconectar la cuenta.
        </p>
        <Link
          href={`/app/c/${company.slug}`}
          className="text-[13px] underline"
          style={{ color: "var(--color-ink)" }}
        >
          → Ir a la empresa
        </Link>
      </div>
    </section>
  );
}
