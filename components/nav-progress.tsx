"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Thin top progress bar that flashes on every route change. React 19 doesn't
// expose transition state at the Link level in a stable API yet, so we listen
// on pathname/search changes and drive a brief animation. Not perfect (misses
// server-action-triggered work) but covers 95% of "did I click that?" cases.
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [prevKey, setPrevKey] = useState<string | null>(null);

  useEffect(() => {
    const key = `${pathname}?${searchParams.toString()}`;
    if (prevKey === null) {
      setPrevKey(key);
      return;
    }
    if (key === prevKey) return;
    setPrevKey(key);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 500);
    return () => clearTimeout(t);
  }, [pathname, searchParams, prevKey]);

  // Also flash briefly on every internal Link click — the pathname change lands
  // ~200-800ms later, this bridges that gap.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const anchor = (e.target as Element | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank" || e.metaKey || e.ctrlKey) return;
      if (href.startsWith("http") && !href.startsWith(window.location.origin)) return;
      setVisible(true);
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true } as EventListenerOptions);
  }, []);

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[2px] pointer-events-none z-50"
      style={{ opacity: visible ? 1 : 0, transition: visible ? "opacity 0.05s" : "opacity 0.25s 0.15s" }}
    >
      <div
        className="h-full origin-left"
        style={{
          background: "var(--color-primary)",
          animation: visible ? "nav-progress 1.2s ease-out forwards" : undefined,
        }}
      />
      <style>{`
        @keyframes nav-progress {
          0%   { transform: scaleX(0); }
          40%  { transform: scaleX(0.55); }
          80%  { transform: scaleX(0.85); }
          100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
