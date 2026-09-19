"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import type { Model } from "@/lib/models";

type InitialMsg = { id: string; role: "user" | "assistant" | "system"; content: string };

export function ObjectiveChat({
  threadId,
  initialModelId,
  models,
  initialMessages,
}: {
  threadId: string;
  initialModelId: string;
  models: Model[];
  initialMessages: InitialMsg[];
}) {
  const [modelId, setModelId] = useState(initialModelId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: "/api/chat",
    id: threadId,
    initialMessages,
    body: { threadId, modelId },
  });

  const busy = status === "streaming" || status === "submitted";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, status]);

  return (
    <>
      <div className="px-8 py-2 flex items-center gap-2 hairline-b">
        <span className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
          Modelo
        </span>
        <select
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          className="hairline rounded-md px-2 py-1 text-[12px] bg-transparent outline-none"
          style={{ background: "var(--color-surface-2)", fontFamily: "var(--font-mono)" }}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <span className="ml-2 text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
          {models.find((m) => m.id === modelId)?.hint ?? ""}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3 max-w-[720px] mx-auto">
            {messages.map((m) => (
              <Bubble
                key={m.id}
                role={m.role as "user" | "assistant" | "system"}
                content={renderContent(m)}
              />
            ))}
            {busy && messages[messages.length - 1]?.role !== "assistant" ? <Typing /> : null}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="hairline-t px-8 py-4">
        <div className="max-w-[720px] mx-auto flex gap-2">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.currentTarget.form as HTMLFormElement).requestSubmit();
              }
            }}
            placeholder="Contale a la IA sobre este objetivo…"
            rows={1}
            className="flex-1 hairline rounded-md px-3 py-2.5 text-[14px] outline-none resize-none"
            style={{ background: "var(--color-surface-2)" }}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-md px-4 text-[13px] font-medium disabled:opacity-50"
            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
          >
            Enviar
          </button>
        </div>
      </form>
    </>
  );
}

/** Extracts the visible text from an AI-SDK message, folding tool calls into a compact note. */
function renderContent(m: { role: string; content: string; parts?: Array<{ type: string; text?: string; toolName?: string; state?: string }> }): string {
  if (m.parts && m.parts.length) {
    return m.parts
      .map((p) => {
        if (p.type === "text" && p.text) return p.text;
        if (p.type === "tool-invocation") {
          const name = (p as { toolInvocation?: { toolName?: string } }).toolInvocation?.toolName ?? p.toolName ?? "tool";
          return `↳ ${name}`;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }
  return m.content ?? "";
}

function Bubble({ role, content }: { role: "user" | "assistant" | "system"; content: string }) {
  if (role === "system") return null;
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

function Typing() {
  return (
    <div className="flex justify-start">
      <div
        className="rounded-lg px-4 py-3 text-[13px]"
        style={{ background: "var(--color-surface-1)", color: "var(--color-ink-subtle)", border: "1px solid var(--color-hairline)" }}
      >
        Pensando…
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="max-w-[620px] mx-auto pt-14">
      <p className="mb-2 text-[11px] tracking-[0.14em] uppercase text-center" style={{ color: "var(--color-ink-subtle)" }}>
        Cómo funciona
      </p>
      <h2
        className="text-[24px] tracking-tight mb-3 text-center"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
      >
        Contame el objetivo y arrancamos.
      </h2>
      <p className="mb-8 text-[14px] text-center" style={{ color: "var(--color-ink-muted)" }}>
        Escribí abajo qué querés lograr — vender más, generar leads, cambiar posicionamiento. Yo me encargo del resto.
      </p>

      <ol className="flex flex-col gap-3 text-[13px]">
        {[
          {
            n: 1,
            t: "Te hago preguntas cortas",
            d: "Público, oferta, presupuesto, tono. Uno por vez, sin cuestionarios eternos.",
          },
          {
            n: 2,
            t: "Redacto el brief",
            d: "Lo ves al toque en el panel derecho. Podés editarlo cuando quieras.",
          },
          {
            n: 3,
            t: "Propongo creativas",
            d: "2-3 variantes de copy + prompt de imagen. Vos subís las imágenes.",
          },
          {
            n: 4,
            t: "Armo la campaña en Meta",
            d: "Con tu OK. En modo aprobación queda pausada, en automático se activa.",
          },
        ].map((step) => (
          <li
            key={step.n}
            className="hairline rounded-md px-4 py-3 flex items-start gap-3"
            style={{ background: "var(--color-surface-1)" }}
          >
            <span
              className="shrink-0 h-6 w-6 rounded-full grid place-items-center text-[11px] font-medium"
              style={{
                background: "var(--color-surface-2)",
                color: "var(--color-ink-muted)",
                border: "1px solid var(--color-hairline)",
              }}
            >
              {step.n}
            </span>
            <div>
              <div className="text-[13px]" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
                {step.t}
              </div>
              <div className="text-[12px] mt-0.5" style={{ color: "var(--color-ink-muted)" }}>
                {step.d}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
