"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Draggable + collapsible right rail wrapper. Persists width and collapsed
// state to localStorage so the layout survives across navigations.
//
// - Drag the left edge to resize between MIN_W and MAX_W.
// - Click the chevron on the top-left to collapse to a slim tab.
// - Click the slim tab to bring the panel back at the last remembered width.
//
// Server-rendered content is passed as `children` — this stays a plain
// wrapper so the rail's contents remain streamed from the server component
// (creatives, campaigns, config form, etc.).

const MIN_W = 300;
const MAX_W = 780;
const DEFAULT_W = 380;
const STORAGE_KEY_W = "rail-width-v1";
const STORAGE_KEY_HIDDEN = "rail-hidden-v1";

export function ResizableRail({ children }: { children: React.ReactNode }) {
  const [width, setWidth] = useState(DEFAULT_W);
  const [hidden, setHidden] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWRef = useRef(DEFAULT_W);

  useEffect(() => {
    try {
      const w = localStorage.getItem(STORAGE_KEY_W);
      const h = localStorage.getItem(STORAGE_KEY_HIDDEN);
      if (w) {
        const n = parseInt(w, 10);
        if (Number.isFinite(n)) setWidth(Math.min(MAX_W, Math.max(MIN_W, n)));
      }
      if (h === "true") setHidden(true);
    } catch { /* localStorage disabled — fall back to defaults */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY_W, String(width)); } catch {}
  }, [width, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY_HIDDEN, String(hidden)); } catch {}
  }, [hidden, hydrated]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startWRef.current = width;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [width]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    // Rail is on the right side, so dragging LEFT (clientX shrinks) grows the rail.
    const delta = startXRef.current - e.clientX;
    const next = Math.min(MAX_W, Math.max(MIN_W, startWRef.current + delta));
    setWidth(next);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  }, []);

  if (!hydrated) {
    // Avoid layout jump on initial render — reserve DEFAULT_W.
    return (
      <aside
        className="shrink-0 flex flex-col hairline-l overflow-y-auto"
        style={{ width: DEFAULT_W, background: "var(--color-surface-1)" }}
      >
        {children}
      </aside>
    );
  }

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        className="shrink-0 hairline-l flex items-center justify-center text-[11px] tracking-wider uppercase hover:bg-[color:var(--color-surface-2)]"
        style={{
          width: 28,
          background: "var(--color-surface-1)",
          color: "var(--color-ink-subtle)",
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          letterSpacing: "0.14em",
        }}
        title="Mostrar panel"
        aria-label="Mostrar panel"
      >
        ‹ Panel
      </button>
    );
  }

  return (
    <aside
      className="relative shrink-0 flex flex-col hairline-l overflow-y-auto"
      style={{ width, background: "var(--color-surface-1)" }}
    >
      {/* Drag handle — a thin strip on the left edge. */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="absolute top-0 bottom-0 left-0 w-1.5 z-10 cursor-col-resize group"
        style={{ touchAction: "none" }}
        title="Arrastrá para redimensionar"
        aria-label="Redimensionar panel"
        role="separator"
      >
        <div
          className="absolute inset-y-0 left-0 w-px transition-colors group-hover:w-0.5"
          style={{ background: "var(--color-hairline-strong)" }}
        />
      </div>

      {/* Collapse button */}
      <button
        type="button"
        onClick={() => setHidden(true)}
        className="absolute top-3 right-3 z-10 rounded-md w-6 h-6 flex items-center justify-center text-[13px] hairline hover:bg-[color:var(--color-surface-2)]"
        style={{ background: "var(--color-surface-1)", color: "var(--color-ink-subtle)" }}
        title="Ocultar panel"
        aria-label="Ocultar panel"
      >
        ›
      </button>

      {children}
    </aside>
  );
}
