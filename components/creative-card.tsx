"use client";

import { useEffect, useRef, useState } from "react";

// Inline creative editor. Copy and image_prompt are always fully visible,
// always editable (native <textarea> that auto-grows to content). On blur,
// if anything changed, calls the server action to save. No modal, no
// expand/collapse.
export function CreativeCard({
  creativeId,
  initialCopy,
  initialPrompt,
  action,
}: {
  creativeId: string;
  initialCopy: string;
  initialPrompt: string | null;
  action: (formData: FormData) => Promise<void>;
}) {
  const [copy, setCopy] = useState(initialCopy);
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const copyRef = useRef<HTMLTextAreaElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow both textareas to fit their content.
  useEffect(() => { autoGrow(copyRef.current); }, [copy]);
  useEffect(() => { autoGrow(promptRef.current); }, [prompt]);

  async function saveIfDirty() {
    if (copy === initialCopy && (prompt || null) === (initialPrompt || null)) return;
    setSaving(true);
    const fd = new FormData();
    fd.set("creative_id", creativeId);
    fd.set("copy_text", copy);
    fd.set("image_prompt", prompt);
    try {
      await action(fd);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  const showSaved = savedAt !== null && Date.now() - savedAt < 3000;

  return (
    <>
      <textarea
        ref={copyRef}
        value={copy}
        onChange={(e) => setCopy(e.target.value)}
        onBlur={saveIfDirty}
        rows={3}
        className="w-full bg-transparent text-[13px] outline-none resize-none leading-[1.5]"
        style={{ color: "var(--color-ink)" }}
        placeholder="Copy del anuncio…"
      />
      <textarea
        ref={promptRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onBlur={saveIfDirty}
        rows={1}
        placeholder="prompt de imagen (opcional)"
        className="w-full mt-2 bg-transparent text-[11px] outline-none resize-none"
        style={{ color: "var(--color-ink-subtle)", fontFamily: "var(--font-mono)" }}
      />
      {saving || showSaved ? (
        <div className="mt-1 text-[10px]" style={{ color: saving ? "var(--color-ink-subtle)" : "var(--color-success)" }}>
          {saving ? "Guardando…" : "✓ Guardado"}
        </div>
      ) : null}
    </>
  );
}

function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
