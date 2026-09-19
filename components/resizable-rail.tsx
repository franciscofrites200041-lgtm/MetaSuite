"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Draggable right rail wrapper. Persists width to localStorage so the layout
// survives across navigations. Right rail is central to the app — no collapse
// state, only resize between MIN_W and MAX_W. If you want to hide something,
// use the left sidebar.
//
// Server-rendered content is passed as `children` — this stays a plain
// wrapper so the rail's contents remain streamed from the server component
// (creatives, campaigns, config form, etc.).

const MIN_W = 300;
const MAX_W = 780;
const DEFAULT_W = 380;
const STORAGE_KEY_W = "rail-width-v1";

export function ResizableRail({ children }: { children: React.ReactNode }) {
  const [width, setWidth] = useState(DEFAULT_W);
  const [hydrated, setHydrated] = useState(false);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWRef = useRef(DEFAULT_W);

  useEffect(() => {
    try {
      const w = localStorage.getItem(STORAGE_KEY_W);
      if (w) {
        const n = parseInt(w, 10);
        if (Number.isFinite(n)) setWidth(Math.min(MAX_W, Math.max(MIN_W, n)));
      }
    } catch { /* localStorage disabled — fall back to default */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY_W, String(width)); } catch {}
  }, [width, hydrated]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startWRef.current = width;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [width]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const delta = startXRef.current - e.clientX;
    const next = Math.min(MAX_W, Math.max(MIN_W, startWRef.current + delta));
    setWidth(next);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  }, []);

  return (
    <aside
      className="relative shrink-0 flex flex-col hairline-l overflow-y-auto"
      style={{ width: hydrated ? width : DEFAULT_W, background: "var(--color-surface-1)" }}
    >
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
      {children}
    </aside>
  );
}
