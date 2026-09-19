"use client";

import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  const [modelFilter, setModelFilter] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const seenResults = useRef<Set<string>>(new Set());

  const filteredGroups = useMemo(() => {
    const q = modelFilter.trim().toLowerCase();
    const match = (m: Model) =>
      !q ||
      m.id.toLowerCase().includes(q) ||
      m.label.toLowerCase().includes(q) ||
      m.provider.toLowerCase().includes(q);
    const groups: Record<string, Model[]> = {};
    for (const m of models) {
      if (!match(m)) continue;
      (groups[m.provider] ||= []).push(m);
    }
    // Preserve incoming order (server already sorted it).
    const orderedProviders: string[] = [];
    for (const m of models) if (groups[m.provider] && !orderedProviders.includes(m.provider)) orderedProviders.push(m.provider);
    return orderedProviders.map((p) => [p, groups[p]] as const);
  }, [models, modelFilter]);

  const selected = models.find((m) => m.id === modelId);

  const { messages, input, handleInputChange, handleSubmit, status, append } = useChat({
    api: "/api/chat",
    id: threadId,
    initialMessages,
    body: { threadId, modelId },
  });

  // Guard against a thread pointing at a model that vanished from the live
  // OpenRouter catalog (retired, renamed, filtered out). Coerce to the first
  // available Anthropic model — or the first in the list if Anthropic is gone
  // too — so the select box doesn't render whatever weird first option the
  // browser picks when value doesn't match any <option>.
  useEffect(() => {
    if (models.length === 0) return;
    if (!models.find((m) => m.id === modelId)) {
      const fallback = models.find((m) => m.providerSlug === "anthropic") ?? models[0];
      setModelId(fallback.id);
    }
  }, [models, modelId]);

  // Auto-grow the composer as the user types. Caps at ~7 lines (200px), then
  // becomes scrollable. Without this, long messages hide behind the fixed
  // rows={1} height.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  const busy = status === "streaming" || status === "submitted";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, status]);

  // While the LLM is streaming save_brief's arguments, mirror the growing
  // brief_md into the right-panel textarea via a window event. This lets the
  // user watch the brief being written in real time.
  useEffect(() => {
    const parts = messages.flatMap((m) => (m as { parts?: unknown[] }).parts ?? []) as Array<{
      type: string;
      toolInvocation?: { toolName?: string; state?: string; args?: { brief_md?: string } };
    }>;
    const latestBrief = [...parts]
      .reverse()
      .find((p) => p.type === "tool-invocation" && p.toolInvocation?.toolName === "save_brief");
    const brief = latestBrief?.toolInvocation?.args?.brief_md;
    if (typeof brief === "string" && brief.length > 0) {
      window.dispatchEvent(new CustomEvent("brief-live", { detail: brief }));
    }
  }, [messages]);

  // When any tool call reaches "result" state, refresh the server component so
  // creatives / campaigns / brief in the right rail sync with the DB. We track
  // toolCallIds we've already refreshed on so a single result doesn't trigger
  // repeated refreshes on subsequent renders.
  useEffect(() => {
    const parts = messages.flatMap((m) => (m as { parts?: unknown[] }).parts ?? []) as Array<{
      type: string;
      toolInvocation?: { toolCallId?: string; state?: string };
    }>;
    let hasNew = false;
    for (const p of parts) {
      if (p.type !== "tool-invocation") continue;
      const ti = p.toolInvocation;
      if (!ti || ti.state !== "result" || !ti.toolCallId) continue;
      if (seenResults.current.has(ti.toolCallId)) continue;
      seenResults.current.add(ti.toolCallId);
      hasNew = true;
    }
    if (hasNew) router.refresh();
  }, [messages, router]);

  return (
    <>
      <div className="px-8 py-2 flex items-center gap-2 hairline-b">
        <span className="text-[11px] shrink-0" style={{ color: "var(--color-ink-subtle)" }}>
          Modelo
        </span>
        <input
          type="text"
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          placeholder={`Buscar en ${models.length} modelos…`}
          className="hairline rounded-md px-2 py-1 text-[12px] outline-none w-[180px]"
          style={{ background: "var(--color-surface-2)" }}
        />
        <select
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          className="hairline rounded-md px-2 py-1 text-[12px] bg-transparent outline-none max-w-[260px]"
          style={{ background: "var(--color-surface-2)", fontFamily: "var(--font-mono)" }}
        >
          {filteredGroups.length === 0 ? (
            <option value={modelId}>Sin resultados</option>
          ) : (
            filteredGroups.map(([provider, list]) => (
              <optgroup key={provider} label={provider}>
                {list.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
            ))
          )}
        </select>
        <span className="ml-2 text-[11px] truncate" style={{ color: "var(--color-ink-subtle)" }}>
          {selected?.hint ?? ""}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3 max-w-[720px] mx-auto">
            {messages.map((m, idx) => {
              const text = renderContent(m as ChatMessage);
              const invocations = extractToolInvocations(m as ChatMessage);
              const role = m.role as "user" | "assistant" | "system";
              const isLast = idx === messages.length - 1;
              return (
                <MessageBlock
                  key={m.id}
                  role={role}
                  text={text}
                  invocations={invocations}
                  onSuggestionPick={isLast && !busy ? (s) => { void append({ role: "user", content: s }); } : undefined}
                />
              );
            })}
            {(() => {
              // Show the thinking indicator whenever the API is busy AND we
              // don't yet have visible assistant text. During tool calls the
              // last message can already be role=assistant but with zero text
              // — hiding the indicator there is what made the UI look frozen.
              if (!busy) return null;
              const last = messages[messages.length - 1];
              const hasText = last?.role === "assistant" && renderContent(last as ChatMessage).trim().length > 0;
              return hasText ? null : <Typing />;
            })()}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="hairline-t px-8 py-4">
        <div className="max-w-[720px] mx-auto flex gap-2">
          <textarea
            ref={textareaRef}
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
            className="flex-1 hairline rounded-md px-3 py-2.5 text-[14px] outline-none resize-none overflow-y-auto"
            style={{ background: "var(--color-surface-2)", maxHeight: 200, minHeight: 42 }}
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

type ChatMessage = {
  role: string;
  content: string;
  parts?: Array<{
    type: string;
    text?: string;
    toolInvocation?: {
      toolName?: string;
      state?: string;
      args?: unknown;
      result?: { ok?: boolean; error?: string } | unknown;
    };
  }>;
};

/** Only the visible prose from an AI-SDK message. Tool calls are surfaced
 *  separately as chips — see extractToolInvocations. */
function renderContent(m: ChatMessage): string {
  if (m.parts && m.parts.length) {
    return m.parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text as string)
      .join("");
  }
  return m.content ?? "";
}

type Invocation = { toolName: string; count: number; pending: boolean; failed: number };

/** Groups tool invocations by name so that N successive `propose_creative`
 *  calls in the same assistant turn collapse into one chip labelled with
 *  the count instead of N repeated identical chips. */
function extractToolInvocations(m: ChatMessage): Invocation[] {
  if (!m.parts) return [];
  const raw = m.parts.filter((p) => p.type === "tool-invocation" && p.toolInvocation?.toolName);
  const groups = new Map<string, Invocation>();
  for (const p of raw) {
    const ti = p.toolInvocation!;
    const name = ti.toolName as string;
    const isResult = ti.state === "result";
    const okFlag = (ti.result as { ok?: boolean } | undefined)?.ok;
    const failed = isResult && okFlag === false;
    const existing = groups.get(name);
    if (existing) {
      existing.count += 1;
      if (!isResult) existing.pending = true;
      if (failed) existing.failed += 1;
    } else {
      groups.set(name, {
        toolName: name,
        count: 1,
        pending: !isResult,
        failed: failed ? 1 : 0,
      });
    }
  }
  return [...groups.values()];
}

// Pulls a ```suggestions ...``` fenced block out of assistant markdown and
// returns the prose + the parsed suggestion lines separately. If no block,
// suggestions is empty.
function splitSuggestions(text: string): { markdown: string; suggestions: string[] } {
  const re = /```suggestions\s*\n([\s\S]*?)```/;
  const m = text.match(re);
  if (!m) return { markdown: text, suggestions: [] };
  const suggestions = m[1]
    .split("\n")
    .map((l) => l.replace(/^[\s\-*•]+/, "").trim())
    .filter(Boolean);
  const markdown = text.replace(re, "").trim();
  return { markdown, suggestions };
}

function MessageBlock({
  role,
  text,
  invocations,
  onSuggestionPick,
}: {
  role: "user" | "assistant" | "system";
  text: string;
  invocations: Invocation[];
  onSuggestionPick?: (suggestion: string) => void;
}) {
  if (role === "system") return null;
  const isUser = role === "user";
  const { markdown, suggestions } = !isUser ? splitSuggestions(text) : { markdown: text, suggestions: [] };
  const hasText = markdown.trim().length > 0;
  return (
    <div className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
      {hasText ? (
        <div
          className="rounded-lg px-4 py-3 text-[14px] max-w-[620px] chat-prose"
          style={{
            background: isUser ? "var(--color-surface-2)" : "var(--color-surface-1)",
            border: "1px solid var(--color-hairline)",
          }}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{text}</div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          )}
        </div>
      ) : null}
      {suggestions.length > 0 && onSuggestionPick ? (
        <div className="flex flex-col gap-2 w-full max-w-[620px] mt-1">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSuggestionPick(s)}
              className="suggestion-card group"
            >
              <span className="flex-1">{s}</span>
              <span
                className="suggestion-arrow shrink-0 ml-3"
                aria-hidden
              >
                →
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {invocations.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 max-w-[620px]">
          {invocations.map((inv, i) => (
            <ToolChip key={i} invocation={inv} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Labels: [singular, pluralTemplate] where `{n}` gets replaced with count.
const TOOL_LABELS: Record<string, [string, string]> = {
  save_brief: ["Actualizó el brief", "Actualizó el brief {n} veces"],
  propose_creative: ["Propuso una creativa", "Propuso {n} creativas"],
  approve_creative: ["Aprobó una creativa", "Aprobó {n} creativas"],
  build_campaign_in_meta: ["Armó la campaña en Meta", "Armó {n} campañas en Meta"],
  pause_or_activate: ["Cambió estado en Meta", "Cambió {n} estados en Meta"],
};

function toolLabel(toolName: string, count: number): string {
  const pair = TOOL_LABELS[toolName];
  if (!pair) return `${toolName}${count > 1 ? ` ×${count}` : ""}`;
  return count > 1 ? pair[1].replace("{n}", String(count)) : pair[0];
}

function ToolChip({ invocation }: { invocation: Invocation }) {
  const label = toolLabel(invocation.toolName, invocation.count);
  const pending = invocation.pending;
  const anyFailed = invocation.failed > 0;
  const dotColor = pending
    ? "var(--color-warning)"
    : anyFailed
      ? "var(--color-danger)"
      : "var(--color-success)";
  return (
    <div
      className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md hairline"
      style={{
        background: "var(--color-surface-2)",
        color: "var(--color-ink-muted)",
        fontFamily: "var(--font-mono)",
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          background: dotColor,
          animation: pending ? "dot-pulse 1.4s infinite ease-in-out" : undefined,
        }}
      />
      <span>{label}</span>
      {pending ? (
        <span className="text-[10px]" style={{ color: "var(--color-ink-subtle)" }}>
          · en curso
        </span>
      ) : anyFailed ? (
        <span className="text-[10px]" style={{ color: "var(--color-danger)" }}>
          · {invocation.failed} {invocation.failed === 1 ? "falló" : "fallaron"}
        </span>
      ) : null}
    </div>
  );
}

function Typing() {
  const [msg, setMsg] = useState("Pensando…");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Rotating status text — honest about the wait without pretending to know
    // what the model is doing. Times are cumulative.
    const stages: Array<{ at: number; msg: string }> = [
      { at: 4, msg: "Buscando en el brief y el historial…" },
      { at: 9, msg: "Elaborando la respuesta…" },
      { at: 16, msg: "Sigo procesando, aguantame…" },
      { at: 28, msg: "El modelo está lento hoy — no te fuiste, esto sigue vivo." },
      { at: 50, msg: "Todavía trabajando. Si querés probá otro modelo más rápido en el selector de arriba." },
    ];
    const start = Date.now();
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      setElapsed(s);
      const active = [...stages].reverse().find((x) => s >= x.at);
      setMsg(active?.msg ?? "Pensando…");
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex justify-start">
      <div
        className="thinking-sheen rounded-lg px-4 py-3 flex items-center gap-3 min-w-[220px]"
        style={{
          background: "var(--color-ai-surface)",
          border: "1px solid var(--color-hairline)",
        }}
      >
        <span className="text-[13px]" style={{ color: "var(--color-ink-muted)" }}>
          {msg}
        </span>
        {elapsed >= 3 ? (
          <span
            className="text-[10px] ml-auto shrink-0"
            style={{ color: "var(--color-ink-subtle)", fontFamily: "var(--font-mono)" }}
          >
            {elapsed}s
          </span>
        ) : null}
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
