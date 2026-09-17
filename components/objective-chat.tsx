"use client";

import { useEffect, useRef, useState } from "react";
import type { Model } from "@/lib/models";

type Msg = { id: string; role: "user" | "assistant" | "system"; content: string };

export function ObjectiveChat({
  threadId,
  initialModelId,
  models,
  initialMessages,
}: {
  threadId: string;
  initialModelId: string;
  models: Model[];
  initialMessages: Msg[];
}) {
  const [modelId, setModelId] = useState(initialModelId);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    const optimistic: Msg = { id: `tmp-${Date.now()}`, role: "user", content: text };
    setMessages((m) => [...m, optimistic]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId, modelId, content: text }),
      });
      const data = await res.json();
      if (data.userMessage) {
        setMessages((m) => m.map((x) => (x.id === optimistic.id ? data.userMessage : x)));
      }
      if (data.assistantMessage) {
        setMessages((m) => [...m, data.assistantMessage]);
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "No pude alcanzar el servicio de IA. Revisá la consola.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

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
              <Bubble key={m.id} msg={m} />
            ))}
            {sending ? <Typing /> : null}
          </div>
        )}
      </div>

      <div className="hairline-t px-8 py-4">
        <div className="max-w-[720px] mx-auto flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Contale a la IA sobre este objetivo…"
            rows={1}
            className="flex-1 hairline rounded-md px-3 py-2.5 text-[14px] outline-none resize-none"
            style={{ background: "var(--color-surface-2)" }}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !input.trim()}
            className="rounded-md px-4 text-[13px] font-medium disabled:opacity-50"
            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
          >
            Enviar
          </button>
        </div>
      </div>
    </>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
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
        {msg.content}
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
    <div className="max-w-[560px] mx-auto pt-16 text-center">
      <h2
        className="text-[22px] tracking-tight mb-3"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
      >
        Contame el objetivo.
      </h2>
      <p className="text-[14px]" style={{ color: "var(--color-ink-muted)" }}>
        Si ya tenés el brief en el panel derecho, la IA lo usa como contexto. Si no, arrancá describiendo
        qué querés lograr y ella se encarga del resto.
      </p>
    </div>
  );
}
