import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { DEFAULT_MODEL_ID } from "@/lib/models";
import { getModelCatalog } from "@/lib/ai/catalog";
import { ObjectiveChat } from "@/components/objective-chat";
import { BriefEditor } from "@/components/brief-editor";
import { ResizableRail } from "@/components/resizable-rail";
import { SubmitButton } from "@/components/submit-button";
import { uploadCreativeImage } from "./creative-actions";

export default async function ObjectivePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = await supabaseServer();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!company) notFound();

  const { data: objective } = await supabase
    .from("objectives")
    .select("id, title, brief_md, status, publish_mode")
    .eq("id", id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!objective) notFound();

  let { data: thread } = await supabase
    .from("chat_threads")
    .select("id, model_id")
    .eq("objective_id", objective.id)
    .maybeSingle();
  if (!thread) {
    const { data } = await supabase
      .from("chat_threads")
      .insert({ objective_id: objective.id, model_id: DEFAULT_MODEL_ID })
      .select("id, model_id")
      .single();
    thread = data;
  }

  const [{ data: messages }, { data: creatives }, { data: campaigns }, models] = await Promise.all([
    supabase.from("chat_messages").select("id, role, content, created_at").eq("thread_id", thread!.id).order("created_at"),
    supabase.from("ad_creatives").select("id, copy_text, image_prompt, image_url, meta_image_hash, status").eq("objective_id", objective.id).order("created_at", { ascending: false }),
    supabase.from("campaigns").select("id, name, status, meta_campaign_id").eq("objective_id", objective.id).order("created_at", { ascending: false }),
    getModelCatalog(),
  ]);

  async function saveBrief(formData: FormData) {
    "use server";
    const brief = String(formData.get("brief_md") ?? "");
    const supa = await supabaseServer();
    await supa.from("objectives").update({ brief_md: brief }).eq("id", id);
    revalidatePath(`/app/c/${slug}/objectives/${id}`);
  }

  async function saveSettings(formData: FormData) {
    "use server";
    const publishMode = String(formData.get("publish_mode") ?? "approval") as "auto" | "approval";
    const title = String(formData.get("title") ?? "").trim();
    const supa = await supabaseServer();
    const patch: Record<string, string> = { publish_mode: publishMode };
    if (title) patch.title = title;
    await supa.from("objectives").update(patch).eq("id", id);
    revalidatePath(`/app/c/${slug}/objectives/${id}`);
  }

  return (
    <div className="flex h-screen min-h-0">
      {/* Chat column */}
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="hairline-b px-8 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
              <Link href={`/app/c/${company.slug}`} style={{ color: "var(--color-ink-subtle)" }}>
                {company.name}
              </Link>
            </div>
            <h1
              className="text-[20px] leading-tight tracking-tight truncate"
              style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
            >
              {objective.title}
            </h1>
          </div>
        </header>
        <ObjectiveChat
          threadId={thread!.id}
          initialModelId={thread!.model_id ?? DEFAULT_MODEL_ID}
          models={models}
          initialMessages={(messages ?? []).map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          }))}
        />
      </section>

      {/* Right rail — resizable + collapsible */}
      <ResizableRail>
        <details open className="hairline-b">
          <summary className="px-6 py-4 cursor-pointer flex items-center justify-between">
            <span className="text-[12px] tracking-wider uppercase" style={{ color: "var(--color-primary)" }}>
              Brief
            </span>
            <span className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
              markdown
            </span>
          </summary>
          <BriefEditor initialBrief={objective.brief_md ?? ""} action={saveBrief} />
        </details>

        <section className="hairline-b px-6 py-4">
          <div className="mb-3 text-[12px] tracking-wider uppercase" style={{ color: "var(--color-primary)" }}>
            Creatividades
          </div>
          {creatives && creatives.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {creatives.map((c, i) => (
                <li
                  key={c.id}
                  className="hairline rounded-md p-3 text-[13px] creative-card"
                  style={{ background: "var(--color-surface-2)", animationDelay: `${Math.min(i, 4) * 80}ms` }}
                >
                  {c.image_url ? (
                    <div className="mb-2 rounded-md overflow-hidden hairline">
                      <Image src={c.image_url} alt="Creative" width={340} height={200} className="w-full h-32 object-cover" unoptimized />
                    </div>
                  ) : null}
                  <div className="line-clamp-3">{c.copy_text}</div>
                  {c.image_prompt ? (
                    <div className="mt-2 text-[11px]" style={{ color: "var(--color-ink-subtle)", fontFamily: "var(--font-mono)" }}>
                      🖼 {c.image_prompt.slice(0, 80)}
                    </div>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] tracking-wider uppercase" style={{ color: "var(--color-ink-tertiary)" }}>
                      {c.status}{c.image_url ? (c.meta_image_hash ? " · listo Meta" : " · pendiente Meta") : ""}
                    </span>
                    <form action={uploadCreativeImage} encType="multipart/form-data" className="flex items-center gap-1">
                      <input type="hidden" name="creative_id" value={c.id} />
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="objective_id" value={id} />
                      <input
                        name="image"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        required
                        className="text-[10px] file:hairline file:rounded-md file:px-2 file:py-1 file:text-[11px] file:mr-2 file:bg-[color:var(--color-canvas)] file:cursor-pointer"
                      />
                      <SubmitButton size="sm" className="!px-2 !py-1 !text-[11px]" pendingLabel="Subiendo…">
                        Subir
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>
              Todavía no hay creatividades. La IA las va a proponer cuando el brief esté claro.
            </p>
          )}
        </section>

        <section className="hairline-b px-6 py-4">
          <div className="mb-3 text-[12px] tracking-wider uppercase" style={{ color: "var(--color-ink-muted)" }}>
            Campañas
          </div>
          {campaigns && campaigns.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {campaigns.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/app/c/${company.slug}/campaigns/${c.id}`}
                    className="block hairline rounded-md p-3 flex items-center justify-between text-[13px] hover:bg-[color:var(--color-surface-2)]"
                    style={{ background: "var(--color-surface-2)" }}
                  >
                    <div className="min-w-0">
                      <div className="truncate">{c.name}</div>
                      <div
                        className="text-[11px] mt-0.5"
                        style={{ color: "var(--color-ink-subtle)", fontFamily: "var(--font-mono)" }}
                      >
                        {c.meta_campaign_id ?? "no publicada"}
                      </div>
                    </div>
                    <span className="text-[11px]" style={{ color: "var(--color-ink-muted)" }}>
                      {c.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>
              Todavía no hay campañas armadas.
            </p>
          )}
        </section>

        <details>
          <summary className="px-6 py-4 cursor-pointer text-[12px] tracking-wider uppercase" style={{ color: "var(--color-primary)" }}>
            Config
          </summary>
          <form action={saveSettings} className="px-6 pb-6 flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>Título</span>
              <input
                name="title"
                type="text"
                defaultValue={objective.title}
                className="hairline rounded-md px-2 py-1.5 text-[13px] outline-none"
                style={{ background: "var(--color-surface-2)" }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>Modo de publicación</span>
              <select
                name="publish_mode"
                defaultValue={objective.publish_mode ?? "approval"}
                className="hairline rounded-md px-2 py-1.5 text-[13px] outline-none"
                style={{ background: "var(--color-surface-2)" }}
              >
                <option value="approval">Con aprobación (default)</option>
                <option value="auto">Automático (activa solo)</option>
              </select>
            </label>
            <SubmitButton size="sm" className="self-end" pendingLabel="Guardando…">
              Guardar
            </SubmitButton>
          </form>
        </details>
      </ResizableRail>
    </div>
  );
}
