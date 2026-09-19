"use client";

import { useEffect, useRef, useState } from "react";
import { SubmitButton } from "@/components/submit-button";

// Client textarea for the objective's brief. Listens to a "brief-live" window
// event so that while the LLM is streaming the arguments of save_brief the
// content shows up here character by character. When the user types manually,
// we drop the "auto-updated" flag so the highlight goes away.
//
// The event bus (window + CustomEvent) sits inside a single page's client
// subtree — no cross-tab leakage — and avoids wiring a context provider just
// to shuttle one string. Emitter lives in components/objective-chat.tsx.
export function BriefEditor({
  initialBrief,
  action,
}: {
  initialBrief: string;
  action: (formData: FormData) => Promise<void> | void;
}) {
  const [value, setValue] = useState(initialBrief);
  const [autoUpdated, setAutoUpdated] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail !== "string" || detail.length === 0) return;
      setValue(detail);
      setAutoUpdated(true);
      // Keep the tail visible as the LLM appends tokens.
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    };
    window.addEventListener("brief-live", handler);
    return () => window.removeEventListener("brief-live", handler);
  }, []);

  return (
    <form action={action} className="px-6 pb-6 flex flex-col gap-3">
      <textarea
        ref={textareaRef}
        name="brief_md"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setAutoUpdated(false);
        }}
        rows={12}
        placeholder="# Contexto..."
        className="hairline rounded-md px-3 py-2.5 text-[13px] outline-none resize-y"
        style={{
          background: autoUpdated ? "var(--color-ai-surface)" : "var(--color-surface-2)",
          fontFamily: "var(--font-mono)",
          lineHeight: 1.55,
          transition: "background 0.4s ease",
          borderColor: autoUpdated ? "color-mix(in oklab, var(--color-primary) 40%, transparent)" : undefined,
        }}
      />
      <div className="flex items-center justify-between gap-2">
        {autoUpdated ? (
          <span className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--color-ink-subtle)" }}>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--color-primary)" }}
            />
            La IA está escribiendo — revisá y guardá cuando esté como querés.
          </span>
        ) : (
          <span />
        )}
        <SubmitButton size="sm" pendingLabel="Guardando…">
          Guardar brief
        </SubmitButton>
      </div>
    </form>
  );
}
