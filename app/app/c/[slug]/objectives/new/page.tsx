import { createObjective } from "../../../../actions";
import { SubmitButton } from "@/components/submit-button";

export default async function NewObjectivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <section className="max-w-[720px] mx-auto px-10 pt-12 pb-24">
      <p className="mb-2 text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        Nuevo objetivo
      </p>
      <h1
        className="text-[32px] leading-[1.1] tracking-tight mb-2"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
      >
        ¿Qué querés lograr con esta pauta?
      </h1>
      <p className="mb-8 text-[14px]" style={{ color: "var(--color-ink-muted)" }}>
        Podés pegar un brief en markdown ahora, o dejar el campo vacío y arrancar por el chat: la IA
        te hace las preguntas necesarias y redacta el brief con vos.
      </p>
      <form action={createObjective} className="flex flex-col gap-5">
        <input type="hidden" name="company_slug" value={slug} />
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px]" style={{ color: "var(--color-ink-muted)" }}>
            Título *
          </span>
          <input
            name="title"
            type="text"
            required
            placeholder="Ej. Lanzamiento X — Q4"
            className="hairline rounded-md px-3 py-2.5 text-[14px] outline-none"
            style={{ background: "var(--color-surface-2)" }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px]" style={{ color: "var(--color-ink-muted)" }}>
            Brief (markdown, opcional)
          </span>
          <textarea
            name="brief_md"
            rows={10}
            placeholder="# Contexto&#10;- Oferta:&#10;- Público:&#10;- Presupuesto:&#10;- Tono:&#10;- Urgencia:"
            className="hairline rounded-md px-3 py-2.5 text-[13px] outline-none resize-y"
            style={{
              background: "var(--color-surface-2)",
              fontFamily: "var(--font-mono)",
              lineHeight: 1.55,
            }}
          />
        </label>
        <SubmitButton className="mt-2 self-start" pendingLabel="Creando…">
          Crear objetivo
        </SubmitButton>
      </form>
    </section>
  );
}
