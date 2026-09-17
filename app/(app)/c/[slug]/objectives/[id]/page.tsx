import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { MODELS, DEFAULT_MODEL_ID } from "@/lib/models";
import { ObjectiveChat } from "@/components/objective-chat";

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

  const [{ data: messages }, { data: creatives }, { data: campaigns }] = await Promise.all([
    supabase.from("chat_messages").select("id, role, content, created_at").eq("thread_id", thread!.id).order("created_at"),
    supabase.from("ad_creatives").select("id, copy_text, image_prompt, status").eq("objective_id", objective.id),
    supabase.from("campaigns").select("id, name, status, meta_campaign_id").eq("objective_id", objective.id),
  ]);

  async function saveBrief(formData: FormData) {
    "use server";
    const brief = String(formData.get("brief_md") ?? "");
    const supa = await supabaseServer();
    await supa.from("objectives").update({ brief_md: brief }).eq("id", id);
    revalidatePath(`/app/c/${slug}/objectives/${id}`);
  }

  return (
    <div className="flex h-screen min-h-0">
      {/* Chat column */}
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="hairline-b px-8 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
              {company.name}
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
          models={MODELS}
          initialMessages={(messages ?? []).map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          }))}
        />
      </section>

      {/* Right rail */}
      <aside
        className="w-[380px] shrink-0 flex flex-col hairline-l overflow-y-auto"
        style={{ background: "var(--color-surface-1)" }}
      >
        <details open className="hairline-b">
          <summary className="px-6 py-4 cursor-pointer flex items-center justify-between">
            <span className="text-[12px] tracking-wider uppercase" style={{ color: "var(--color-ink-muted)" }}>
              Brief
            </span>
            <span className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
              markdown
            </span>
          </summary>
          <form action={saveBrief} className="px-6 pb-6 flex flex-col gap-3">
            <textarea
              name="brief_md"
              defaultValue={objective.brief_md ?? ""}
              rows={16}
              placeholder="# Contexto..."
              className="hairline rounded-md px-3 py-2.5 text-[13px] outline-none resize-y"
              style={{
                background: "var(--color-surface-2)",
                fontFamily: "var(--font-mono)",
                lineHeight: 1.55,
              }}
            />
            <button
              type="submit"
              className="self-end rounded-md px-3 py-1.5 text-[12px] font-medium"
              style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
            >
              Guardar brief
            </button>
          </form>
        </details>

        <section className="hairline-b px-6 py-4">
          <div className="mb-3 text-[12px] tracking-wider uppercase" style={{ color: "var(--color-ink-muted)" }}>
            Creatividades
          </div>
          {creatives && creatives.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {creatives.map((c) => (
                <li
                  key={c.id}
                  className="hairline rounded-md p-3 text-[13px]"
                  style={{ background: "var(--color-surface-2)" }}
                >
                  <div className="line-clamp-3">{c.copy_text}</div>
                  {c.image_prompt ? (
                    <div className="mt-2 text-[11px]" style={{ color: "var(--color-ink-subtle)", fontFamily: "var(--font-mono)" }}>
                      🖼 {c.image_prompt.slice(0, 80)}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>
              Todavía no hay creatividades. La IA las va a proponer cuando el brief esté claro.
            </p>
          )}
        </section>

        <section className="px-6 py-4">
          <div className="mb-3 text-[12px] tracking-wider uppercase" style={{ color: "var(--color-ink-muted)" }}>
            Campañas
          </div>
          {campaigns && campaigns.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {campaigns.map((c) => (
                <li
                  key={c.id}
                  className="hairline rounded-md p-3 flex items-center justify-between text-[13px]"
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
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>
              Todavía no hay campañas armadas.
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
