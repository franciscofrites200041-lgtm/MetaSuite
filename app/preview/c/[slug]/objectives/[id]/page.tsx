import Link from "next/link";

const MOCK_BRIEF = `# Objetivo
Vender camionetas Toyota Hilux usadas modelos 2020-2023 en CABA y GBA.

# Público
- Hombres 32-55, ingresos medio-altos
- Interesados en autos, familia, camping/aventura
- Ubicación: CABA + GBA (radio 40km centro)

# Presupuesto
- ARS 25.000/día
- 21 días de campaña

# Oferta
- Financiación en 24 cuotas sin interés
- Entrega en 48hs
- Garantía 6 meses

# Tono
Directo, sin adornos. Enfoque en confiabilidad y precio justo.
`;

const MOCK_MESSAGES = [
  { role: "assistant" as const, content: "Antes de proponer creatividades, dos preguntas: ¿la financiación en 24 cuotas la ofrecés vos o pasa por una entidad externa? Y para el radio de GBA, ¿tenés límite duro (ej. no llegar a La Plata) o priorizás cobertura?" },
  { role: "user" as const, content: "La financiación es propia, sin banco. Y GBA norte y oeste, sí me interesa. La Plata no." },
  { role: "assistant" as const, content: "Perfecto. Con eso armo tres variantes de copy. Las tres apuntan al mismo público pero con hipótesis distintas de gatillo emocional:\n\n**Variante A — Confianza / \"sin banco\"**\nComprá tu Hilux usada sin pasar por el banco. 24 cuotas fijas, garantía 6 meses, entrega en 48hs. Todo con nosotros.\n\n**Variante B — Aventura / lifestyle**\nLa Hilux que necesitás para el finde ya está en el depósito. Financiación propia, sin sorpresas. Vení a verla.\n\n**Variante C — Urgencia / precio**\nSemana Hilux. Modelos 2020-2023 con financiación propia en 24 cuotas fijas. Solo hasta el domingo.\n\n¿Cuál activamos primero, o querés que arme A/B con dos?" },
];

const MOCK_CREATIVES = [
  { id: "cr1", copy: MOCK_MESSAGES[2].content.split("\n\n")[1].replace("**Variante A — Confianza / \"sin banco\"**\n", ""), img: "hilux 2022 gris frente 3/4, luz de tarde dorada, playa de estacionamiento profesional, sin logos", status: "draft" },
  { id: "cr2", copy: MOCK_MESSAGES[2].content.split("\n\n")[2].replace("**Variante B — Aventura / lifestyle**\n", ""), img: "hilux blanca en camino de tierra cordillera, atardecer, polvo suspendido, foto documental", status: "draft" },
  { id: "cr3", copy: MOCK_MESSAGES[2].content.split("\n\n")[3].replace("**Variante C — Urgencia / precio**\n", ""), img: "hilux negra en concesionario luces cálidas, sticker precio grande, sensacion oferta limitada", status: "draft" },
];

const MOCK_CAMPAIGNS = [
  { id: "c1", name: "AUGUR · Camioneta usada Q4 · CABA", status: "published", meta_id: "23854927319200104" },
];

export default async function PreviewObjective({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;

  return (
    <div className="flex h-screen min-h-0">
      {/* Chat column */}
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="hairline-b px-8 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
              <Link href={`/preview/c/${slug}`} style={{ color: "var(--color-ink-subtle)" }}>
                Surmotors
              </Link>
            </div>
            <h1
              className="text-[20px] leading-tight tracking-tight truncate"
              style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
            >
              Camioneta usada Q4 · CABA
            </h1>
          </div>
        </header>

        <div className="px-8 py-2 flex items-center gap-2 hairline-b">
          <span className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>Modelo</span>
          <span className="hairline rounded-md px-2 py-1 text-[12px]" style={{ background: "var(--color-surface-2)", fontFamily: "var(--font-mono)" }}>
            anthropic/claude-sonnet-4-6
          </span>
          <span className="ml-2 text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
            Equilibrio calidad/costo. Default.
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="flex flex-col gap-3 max-w-[720px] mx-auto">
            {MOCK_MESSAGES.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} />
            ))}
          </div>
        </div>

        <div className="hairline-t px-8 py-4">
          <div className="max-w-[720px] mx-auto flex gap-2">
            <input
              placeholder="Contale a la IA sobre este objetivo…"
              className="flex-1 hairline rounded-md px-3 py-2.5 text-[14px] outline-none"
              style={{ background: "var(--color-surface-2)" }}
              readOnly
            />
            <button
              className="rounded-md px-4 text-[13px] font-medium"
              style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
            >
              Enviar
            </button>
          </div>
        </div>
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
            <span className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>markdown</span>
          </summary>
          <div className="px-6 pb-6">
            <div
              className="hairline rounded-md px-3 py-2.5 text-[13px] whitespace-pre-wrap"
              style={{ background: "var(--color-surface-2)", fontFamily: "var(--font-mono)", lineHeight: 1.55 }}
            >
              {MOCK_BRIEF}
            </div>
          </div>
        </details>

        <section className="hairline-b px-6 py-4">
          <div className="mb-3 text-[12px] tracking-wider uppercase" style={{ color: "var(--color-ink-muted)" }}>
            Creatividades
          </div>
          <ul className="flex flex-col gap-3">
            {MOCK_CREATIVES.map((c) => (
              <li key={c.id} className="hairline rounded-md p-3 text-[13px]" style={{ background: "var(--color-surface-2)" }}>
                <div className="line-clamp-3">{c.copy}</div>
                <div className="mt-2 text-[11px]" style={{ color: "var(--color-ink-subtle)", fontFamily: "var(--font-mono)" }}>
                  🖼 {c.img.slice(0, 80)}
                </div>
                <div className="mt-2 text-[10px] tracking-wider uppercase" style={{ color: "var(--color-ink-tertiary)" }}>
                  {c.status}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="px-6 py-4">
          <div className="mb-3 text-[12px] tracking-wider uppercase" style={{ color: "var(--color-ink-muted)" }}>
            Campañas
          </div>
          <ul className="flex flex-col gap-2">
            {MOCK_CAMPAIGNS.map((c) => (
              <li key={c.id} className="hairline rounded-md p-3 flex items-center justify-between text-[13px]" style={{ background: "var(--color-surface-2)" }}>
                <div className="min-w-0">
                  <div className="truncate">{c.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--color-ink-subtle)", fontFamily: "var(--font-mono)" }}>
                    {c.meta_id}
                  </div>
                </div>
                <span className="text-[11px]" style={{ color: "var(--color-ink-muted)" }}>{c.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="rounded-lg px-4 py-3 text-[14px] max-w-[620px] whitespace-pre-wrap"
        style={{
          background: isUser ? "var(--color-surface-2)" : "var(--color-surface-1)",
          borderLeft: isUser ? "none" : "3px solid color-mix(in oklab, var(--color-primary) 60%, transparent)",
          border: "1px solid var(--color-hairline)",
        }}
      >
        {content}
      </div>
    </div>
  );
}
