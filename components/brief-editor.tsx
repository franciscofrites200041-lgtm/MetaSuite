"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SubmitButton } from "@/components/submit-button";

// Client editor for the objective's brief. Two modes:
//   - "view":   renders the markdown as prose (default when there's content)
//   - "edit":   plain textarea, save button (form action)
// Listens to the "brief-live" window event dispatched by objective-chat.tsx
// while the LLM streams save_brief args, so the textarea/preview fills in
// character by character.
export function BriefEditor({
  initialBrief,
  action,
}: {
  initialBrief: string;
  action: (formData: FormData) => Promise<void> | void;
}) {
  const [value, setValue] = useState(initialBrief);
  const [autoUpdated, setAutoUpdated] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">(initialBrief.trim().length > 0 ? "view" : "edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail !== "string" || detail.length === 0) return;
      setValue(detail);
      setAutoUpdated(true);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    };
    window.addEventListener("brief-live", handler);
    return () => window.removeEventListener("brief-live", handler);
  }, []);

  const hasContent = value.trim().length > 0;

  return (
    <form action={action} className="px-6 pb-6 flex flex-col gap-3">
      <div className="flex items-center gap-1 text-[11px]">
        <button
          type="button"
          onClick={() => setMode("view")}
          disabled={!hasContent}
          className="rounded-md px-2 py-1 disabled:opacity-40"
          style={{
            background: mode === "view" ? "var(--color-surface-2)" : "transparent",
            border: mode === "view" ? "1px solid var(--color-hairline)" : "1px solid transparent",
            color: mode === "view" ? "var(--color-ink)" : "var(--color-ink-subtle)",
          }}
        >
          Vista
        </button>
        <button
          type="button"
          onClick={() => setMode("edit")}
          className="rounded-md px-2 py-1"
          style={{
            background: mode === "edit" ? "var(--color-surface-2)" : "transparent",
            border: mode === "edit" ? "1px solid var(--color-hairline)" : "1px solid transparent",
            color: mode === "edit" ? "var(--color-ink)" : "var(--color-ink-subtle)",
          }}
        >
          Edición
        </button>
        {autoUpdated ? (
          <span className="ml-auto flex items-center gap-1.5" style={{ color: "var(--color-ink-subtle)" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-primary)" }} />
            La IA lo actualizó
          </span>
        ) : null}
      </div>

      {/* Hidden field so the form action still gets the current value even in view mode. */}
      <input type="hidden" name="brief_md" value={value} />

      {mode === "edit" ? (
        <textarea
          ref={textareaRef}
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
          }}
        />
      ) : hasContent ? (
        <div
          className="hairline rounded-md px-3 py-2.5 chat-prose text-[13px] max-h-[60vh] overflow-y-auto"
          style={{
            background: autoUpdated ? "var(--color-ai-surface)" : "var(--color-surface-2)",
            transition: "background 0.4s ease",
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
        </div>
      ) : (
        <div
          className="hairline rounded-md px-3 py-6 text-[12px] text-center"
          style={{ background: "var(--color-surface-2)", color: "var(--color-ink-subtle)" }}
        >
          Todavía no hay brief. La IA lo va a ir escribiendo mientras conversan.
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {autoUpdated ? (
          <span className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
            Revisá y guardá cuando esté como querés.
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
