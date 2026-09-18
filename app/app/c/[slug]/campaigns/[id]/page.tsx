import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { publishAdInMeta } from "./ad-actions";

export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { slug, id } = await params;
  const sp = await searchParams;
  const supabase = await supabaseServer();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!company) notFound();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, status, meta_campaign_id, payload, objective_id, objectives!inner(id, title, publish_mode, company_id)")
    .eq("id", id)
    .maybeSingle();
  if (!campaign || (campaign as unknown as { objectives: { company_id: string } }).objectives.company_id !== company.id) notFound();

  const [{ data: adSets }, { data: ads }] = await Promise.all([
    supabase.from("ad_sets").select("id, name, status, meta_adset_id, payload").eq("campaign_id", campaign.id),
    supabase
      .from("ads")
      .select("id, name, status, meta_ad_id, ad_set_id, creative_id, payload, ad_creatives(copy_text, image_prompt, image_url, meta_image_hash)")
      .in("ad_set_id", (await supabase.from("ad_sets").select("id").eq("campaign_id", campaign.id)).data?.map((s) => s.id) ?? []),
  ]);

  async function publish(formData: FormData) {
    "use server";
    const campaignId = String(formData.get("campaign_id"));
    const companyId = String(formData.get("company_id"));
    const supa = await supabaseServer();
    const { updateMetaEntityStatus } = await import("@/lib/meta/graph");

    const { data: camp } = await supa
      .from("campaigns")
      .select("id, meta_campaign_id")
      .eq("id", campaignId)
      .maybeSingle();
    if (!camp?.meta_campaign_id) {
      return;
    }
    const r = await updateMetaEntityStatus(supa, companyId, camp.meta_campaign_id, "ACTIVE");
    if (!r.ok) return;

    const { data: sets } = await supa.from("ad_sets").select("id, meta_adset_id").eq("campaign_id", campaignId);
    for (const s of sets ?? []) {
      if (s.meta_adset_id) await updateMetaEntityStatus(supa, companyId, s.meta_adset_id, "ACTIVE");
    }
    await supa.from("campaigns").update({ status: "published" }).eq("id", campaignId);
    await supa.from("ad_sets").update({ status: "published" }).eq("campaign_id", campaignId);
    revalidatePath(`/app/c/${slug}/campaigns/${campaignId}`);
  }

  async function pauseCampaign(formData: FormData) {
    "use server";
    const campaignId = String(formData.get("campaign_id"));
    const companyId = String(formData.get("company_id"));
    const supa = await supabaseServer();
    const { updateMetaEntityStatus } = await import("@/lib/meta/graph");
    const { data: camp } = await supa.from("campaigns").select("meta_campaign_id").eq("id", campaignId).maybeSingle();
    if (!camp?.meta_campaign_id) return;
    await updateMetaEntityStatus(supa, companyId, camp.meta_campaign_id, "PAUSED");
    await supa.from("campaigns").update({ status: "paused" }).eq("id", campaignId);
    revalidatePath(`/app/c/${slug}/campaigns/${campaignId}`);
  }

  const objective = (campaign as unknown as { objectives: { id: string; title: string; publish_mode: "auto" | "approval" | null } }).objectives;

  return (
    <section className="max-w-[1080px] mx-auto px-10 pt-12 pb-24">
      <div className="mb-6 flex items-center gap-2 text-[12px]" style={{ color: "var(--color-ink-subtle)" }}>
        <Link href={`/app/c/${company.slug}`}>{company.name}</Link>
        <span>/</span>
        <Link href={`/app/c/${company.slug}/objectives/${objective.id}`}>{objective.title}</Link>
        <span>/</span>
        <span>Campaña</span>
      </div>

      <div className="flex items-baseline justify-between mb-8">
        <div>
          <p
            className="mb-2 text-[11px] tracking-[0.14em] uppercase"
            style={{ color: "var(--color-ink-subtle)" }}
          >
            Campaña
          </p>
          <h1
            className="text-[28px] leading-[1.1] tracking-tight"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
          >
            {campaign.name}
          </h1>
          <p className="mt-1 text-[12px]" style={{ color: "var(--color-ink-subtle)", fontFamily: "var(--font-mono)" }}>
            {campaign.meta_campaign_id ?? "sin id de Meta"}
          </p>
        </div>
        <StatusActions
          status={campaign.status}
          campaignId={campaign.id}
          companyId={company.id}
          publish={publish}
          pause={pauseCampaign}
        />
      </div>

      {sp.error ? (
        <div className="mb-6 hairline rounded-md px-4 py-3 text-[13px]" style={{ background: "color-mix(in oklab, var(--color-danger) 8%, var(--color-surface-1))", color: "var(--color-danger)" }}>
          {sp.error}
        </div>
      ) : null}

      {/* Ad sets */}
      <section className="hairline rounded-lg mb-8" style={{ background: "var(--color-surface-1)" }}>
        <header className="px-6 py-4 hairline-b">
          <h2 className="text-[14px] tracking-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
            Ad Sets
          </h2>
        </header>
        {adSets && adSets.length > 0 ? (
          <ul>
            {adSets.map((s, i) => (
              <li key={s.id} className={i > 0 ? "hairline-t px-6 py-4" : "px-6 py-4"}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px]">{s.name}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: "var(--color-ink-subtle)", fontFamily: "var(--font-mono)" }}>
                      {s.meta_adset_id ?? "sin id"} · {formatBudget((s.payload as { daily_budget_cents?: number })?.daily_budget_cents)}
                    </div>
                  </div>
                  <span className="text-[11px]" style={{ color: "var(--color-ink-muted)" }}>{s.status}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-8 text-center text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>
            Todavía no hay ad sets.
          </div>
        )}
      </section>

      {/* Ads (DB drafts) */}
      <section className="hairline rounded-lg" style={{ background: "var(--color-surface-1)" }}>
        <header className="px-6 py-4 hairline-b flex items-center justify-between">
          <h2 className="text-[14px] tracking-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
            Ads
          </h2>
          <span className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
            Cada ad se publica cuando su creative tiene imagen y la empresa tiene website URL.
          </span>
        </header>
        {ads && ads.length > 0 ? (
          <ul>
            {ads.map((a, i) => {
              const creative = (a as unknown as { ad_creatives: { copy_text: string; image_prompt: string | null; image_url: string | null; meta_image_hash: string | null } | null }).ad_creatives;
              const canPublish = a.status === "draft" && !!creative?.image_url;
              const err = (a as unknown as { payload: { error?: string } | null }).payload?.error;
              return (
                <li key={a.id} className={i > 0 ? "hairline-t px-6 py-4" : "px-6 py-4"}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px]">{a.name}</div>
                      {creative ? (
                        <>
                          <p className="mt-2 text-[13px] line-clamp-3" style={{ color: "var(--color-ink-muted)" }}>
                            {creative.copy_text}
                          </p>
                          {creative.image_url ? (
                            <p className="mt-1 text-[11px]" style={{ color: "var(--color-ink-subtle)", fontFamily: "var(--font-mono)" }}>
                              🖼 imagen: {creative.meta_image_hash ? "sincronizada con Meta" : "pendiente de subir a Meta"}
                            </p>
                          ) : (
                            <p className="mt-1 text-[11px]" style={{ color: "var(--color-warning)" }}>
                              Falta subir imagen — hacelo en la vista del objetivo antes de publicar.
                            </p>
                          )}
                        </>
                      ) : null}
                      {err ? (
                        <p className="mt-2 text-[11px]" style={{ color: "var(--color-danger)" }}>
                          Meta: {err}
                        </p>
                      ) : null}
                      {a.meta_ad_id ? (
                        <p className="mt-1 text-[11px]" style={{ color: "var(--color-ink-subtle)", fontFamily: "var(--font-mono)" }}>
                          meta_ad_id: {a.meta_ad_id}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[11px]" style={{ color: "var(--color-ink-muted)" }}>{a.status}</span>
                      {canPublish ? (
                        <form action={publishAdInMeta}>
                          <input type="hidden" name="ad_id" value={a.id} />
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="campaign_id" value={campaign.id} />
                          <button
                            type="submit"
                            className="rounded-md px-3 py-1.5 text-[12px] font-medium"
                            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
                          >
                            Publicar ad
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-6 py-8 text-center text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>
            Todavía no hay ads en este ad set.
          </div>
        )}
      </section>
    </section>
  );
}

function StatusActions({
  status,
  campaignId,
  companyId,
  publish,
  pause,
}: {
  status: string;
  campaignId: string;
  companyId: string;
  publish: (fd: FormData) => Promise<void>;
  pause: (fd: FormData) => Promise<void>;
}) {
  return (
    <div className="flex items-center gap-3">
      <StatusPill status={status} />
      {(status === "pending_approval" || status === "paused") ? (
        <form action={publish}>
          <input type="hidden" name="campaign_id" value={campaignId} />
          <input type="hidden" name="company_id" value={companyId} />
          <button
            type="submit"
            className="rounded-md px-3 py-1.5 text-[12px] font-medium"
            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
          >
            Publicar
          </button>
        </form>
      ) : null}
      {status === "published" ? (
        <form action={pause}>
          <input type="hidden" name="campaign_id" value={campaignId} />
          <input type="hidden" name="company_id" value={companyId} />
          <button
            type="submit"
            className="hairline rounded-md px-3 py-1.5 text-[12px]"
            style={{ background: "var(--color-surface-2)", color: "var(--color-ink-muted)" }}
          >
            Pausar
          </button>
        </form>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    draft: { bg: "var(--color-surface-2)", fg: "var(--color-ink-muted)", label: "Borrador" },
    pending_approval: { bg: "color-mix(in oklab, var(--color-warning) 14%, transparent)", fg: "var(--color-warning)", label: "Pendiente" },
    published: { bg: "color-mix(in oklab, var(--color-success) 14%, transparent)", fg: "var(--color-success)", label: "Activa" },
    paused: { bg: "var(--color-surface-2)", fg: "var(--color-ink-subtle)", label: "Pausada" },
    error: { bg: "color-mix(in oklab, var(--color-danger) 12%, transparent)", fg: "var(--color-danger)", label: "Error" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] tracking-wider uppercase"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

function formatBudget(cents: number | undefined): string {
  if (!cents) return "sin presupuesto";
  return `$${(cents / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })}/día`;
}
