"use client";

import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DEFAULT_MODEL_ID } from "@/lib/models";

type InitialMsg = { id: string; role: "user" | "assistant" | "system"; content: string };

export function ObjectiveChat({
  threadId,
  initialMessages,
}: {
  threadId: string;
  initialMessages: InitialMsg[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const seenResults = useRef<Set<string>>(new Set());

  // Model is hardcoded at build time now — no user-facing selector.
  const { messages, input, handleInputChange, handleSubmit, status, append } = useChat({
    api: "/api/chat",
    id: threadId,
    initialMessages,
    body: { threadId, modelId: DEFAULT_MODEL_ID },
  });

  const busy = status === "streaming" || status === "submitted";

  // Auto-grow the composer as the user types. Caps at ~7 lines (200px), then
  // becomes scrollable. Without this, long messages hide behind the fixed
  // rows={1} height.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  // Pending questionnaire — extracted from the last assistant message. If the
  // assistant is streaming (busy), we wait until it finishes before showing
  // the panel, otherwise partial ```suggestions``` blocks would flicker.
  const pendingQuestions = useMemo<PendingQuestion[]>(() => {
    if (busy) return [];
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return [];
    const text = renderContent(last as ChatMessage);
    return extractQuestions(text).questions;
  }, [messages, busy]);

  // Parallel array — each question gets multi-select picks + a free-text
  // custom answer. Resets whenever the questionnaire changes.
  const [answers, setAnswers] = useState<Array<{ picks: string[]; custom: string }>>([]);
  const [qIdx, setQIdx] = useState(0);
  useEffect(() => {
    setAnswers(pendingQuestions.map(() => ({ picks: [], custom: "" })));
    setQIdx(0);
  }, [pendingQuestions]);

  function togglePick(qi: number, opt: string) {
    setAnswers((prev) => {
      const next = [...prev];
      const cur = { ...next[qi] };
      cur.picks = cur.picks.includes(opt) ? cur.picks.filter((p) => p !== opt) : [...cur.picks, opt];
      next[qi] = cur;
      return next;
    });
  }
  function setCustom(qi: number, text: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[qi] = { ...next[qi], custom: text };
      return next;
    });
  }

  // Combine every answered question into a single user message, then also
  // append any free text from the composer. Unanswered questions are omitted.
  async function submitCombined() {
    const parts: string[] = [];
    for (let i = 0; i < pendingQuestions.length; i++) {
      const a = answers[i];
      if (!a) continue;
      const joined = [...a.picks, a.custom.trim()].filter(Boolean).join(", ");
      if (joined) parts.push(`- ${pendingQuestions[i].question} — ${joined}`);
    }
    const extra = input.trim();
    const combined = [parts.join("\n"), extra].filter(Boolean).join("\n\n");
    if (!combined) return;
    setAnswers([]);
    setQIdx(0);
    handleInputChange({ target: { value: "" } } as React.ChangeEvent<HTMLTextAreaElement>);
    await append({ role: "user", content: combined });
  }

  const hasQuestions = pendingQuestions.length > 0;
  const currentAnswer = answers[qIdx];
  const currentHasAnswer = !!currentAnswer && (currentAnswer.picks.length > 0 || currentAnswer.custom.trim().length > 0);
  const isLastQuestion = qIdx === pendingQuestions.length - 1;
  // Send is enabled if: (a) no pending questions and composer has text, or
  // (b) we're on the last question. Otherwise "Siguiente" advances.
  const canSend = !busy && (
    (!hasQuestions && input.trim().length > 0) ||
    (hasQuestions && isLastQuestion)
  );

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
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3 max-w-[720px] mx-auto">
            {messages.map((m) => {
              const text = renderContent(m as ChatMessage);
              const invocations = extractToolInvocations(m as ChatMessage);
              const role = m.role as "user" | "assistant" | "system";
              return (
                <MessageBlock
                  key={m.id}
                  role={role}
                  text={text}
                  invocations={invocations}
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (hasQuestions && !isLastQuestion) {
            setQIdx((n) => n + 1);
          } else if (hasQuestions) {
            void submitCombined();
          } else {
            handleSubmit(e);
          }
        }}
        className="hairline-t px-8 py-4"
      >
        <div className="max-w-[720px] mx-auto flex flex-col gap-3">
          {hasQuestions ? (
            <PendingPanel
              questions={pendingQuestions}
              qIdx={qIdx}
              answer={currentAnswer ?? { picks: [], custom: "" }}
              onTogglePick={(opt) => togglePick(qIdx, opt)}
              onSetCustom={(text) => setCustom(qIdx, text)}
              onBack={qIdx > 0 ? () => setQIdx((n) => n - 1) : undefined}
            />
          ) : null}

          <div className="flex gap-2">
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
              placeholder={
                hasQuestions
                  ? "Contexto extra opcional…"
                  : "Contale a la IA sobre este objetivo…"
              }
              rows={1}
              className="flex-1 hairline rounded-md px-3 py-2.5 text-[14px] outline-none resize-none overflow-y-auto"
              style={{ background: "var(--color-surface-2)", maxHeight: 200, minHeight: 42 }}
            />
            <button
              type="submit"
              disabled={hasQuestions && !isLastQuestion ? (!currentHasAnswer || busy) : !canSend}
              className="rounded-md px-4 text-[13px] font-medium disabled:opacity-50"
              style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
            >
              {hasQuestions && !isLastQuestion ? "Siguiente" : "Enviar"}
            </button>
          </div>
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

function PendingPanel({
  questions,
  qIdx,
  answer,
  onTogglePick,
  onSetCustom,
  onBack,
}: {
  questions: PendingQuestion[];
  qIdx: number;
  answer: { picks: string[]; custom: string };
  onTogglePick: (opt: string) => void;
  onSetCustom: (text: string) => void;
  onBack?: () => void;
}) {
  const q = questions[qIdx];
  if (!q) return null;
  return (
    <div
      className="hairline rounded-lg px-4 py-3 flex flex-col gap-3"
      style={{ background: "var(--color-surface-1)" }}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-wider uppercase" style={{ color: "var(--color-ink-subtle)" }}>
          Pregunta {qIdx + 1} de {questions.length} · elegí una o varias
        </div>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-[11px] hover:underline"
            style={{ color: "var(--color-ink-subtle)" }}
          >
            ← Anterior
          </button>
        ) : null}
      </div>
      <div className="text-[14px]" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)", fontWeight: 500 }}>
        {q.question}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {q.options.map((opt) => {
          const selected = answer.picks.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onTogglePick(opt)}
              className="rounded-full px-3 py-1.5 text-[12.5px] transition-colors"
              style={{
                background: selected
                  ? "color-mix(in oklab, var(--color-primary) 14%, var(--color-surface-2))"
                  : "var(--color-surface-2)",
                border: `1px solid ${
                  selected
                    ? "color-mix(in oklab, var(--color-primary) 60%, var(--color-hairline))"
                    : "var(--color-hairline)"
                }`,
                color: selected ? "var(--color-primary)" : "var(--color-ink)",
              }}
            >
              {selected ? "✓ " : ""}
              {opt}
            </button>
          );
        })}
      </div>
      <input
        type="text"
        value={answer.custom}
        onChange={(e) => onSetCustom(e.target.value)}
        placeholder="o escribí tu propia respuesta…"
        className="hairline rounded-md px-3 py-2 text-[13px] outline-none"
        style={{ background: "var(--color-surface-2)" }}
      />
    </div>
  );
}

type PendingQuestion = { question: string; options: string[] };

// Pulls ALL ```suggestions``` fenced blocks out of an assistant message. Each
// block's first line is treated as the question (must end with `?`). Remaining
// lines are the options. Blocks without a valid question line get dropped —
// the LLM might be mid-stream, we skip until it's structured.
function extractQuestions(text: string): { markdown: string; questions: PendingQuestion[] } {
  const re = /```suggestions\s*\n([\s\S]*?)```/g;
  const questions: PendingQuestion[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const lines = m[1]
      .split("\n")
      .map((l) => l.replace(/^[\s\-*•]+/, "").trim())
      .filter(Boolean);
    if (lines.length < 2) continue;
    const first = lines[0];
    if (!first.endsWith("?") && !first.endsWith("？")) continue;
    questions.push({ question: first, options: lines.slice(1) });
  }
  const markdown = text.replace(re, "").trim();
  return { markdown, questions };
}

function MessageBlock({
  role,
  text,
  invocations,
}: {
  role: "user" | "assistant" | "system";
  text: string;
  invocations: Invocation[];
}) {
  if (role === "system") return null;
  const isUser = role === "user";
  // For assistant messages, strip the ```suggestions``` blocks — those get
  // rendered as a questionnaire above the composer instead.
  const stripped = !isUser ? extractQuestions(text).markdown : text;
  const hasText = stripped.trim().length > 0;
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
            <div className="whitespace-pre-wrap">{stripped}</div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{stripped}</ReactMarkdown>
          )}
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
