"use client";

import { useEffect, useState } from "react";

// Spotlight tour: highlights one element at a time with a dark overlay,
// tooltip beside it, prev/next/skip controls. Auto-opens on first visit
// to the dashboard in preview mode (once seen → localStorage flag).
// Elements to spotlight declare themselves with `data-tour="<id>"`.

type Step = {
  id: string | null; // null = intro / no highlight
  title: string;
  desc: string;
};

const STEPS: Step[] = [
  {
    id: null,
    title: "Cómo leer tu dashboard",
    desc:
      "Te muestro qué es cada cosa. Es rápido — menos de 30 segundos. Podés saltarlo cuando quieras.",
  },
  {
    id: "kpi-spend",
    title: "Gasto",
    desc:
      "Cuánta plata ya se debitó del ad account en los últimos 30 días. Es el total invertido en publicidad para esta empresa.",
  },
  {
    id: "kpi-impressions",
    title: "Impresiones y Reach",
    desc:
      "Impresiones = cuántas veces los ads aparecieron en pantalla. Reach = a cuántas personas únicas les llegó. Una persona puede sumar varias impresiones si vio el ad varias veces.",
  },
  {
    id: "kpi-clicks",
    title: "Clicks y CTR",
    desc:
      "Cuántos clicks acumularon los ads y qué porcentaje de las impresiones se convirtió en click. Arriba de 1.5% ya es sano; por debajo suele indicar que la creativa no engancha.",
  },
  {
    id: "kpi-cost",
    title: "CPC y CPM",
    desc:
      "CPC = cuánto pagás en promedio por cada click. CPM = costo de comprar 1000 impresiones. Sirven para comparar qué tan caro es tu público y qué tan eficiente cada anuncio.",
  },
  {
    id: "kpi-conversions",
    title: "Conversiones y CPA",
    desc:
      "Cuánta gente hizo la acción que buscás (comprar, dejar el mail) y cuánto te costó cada una (CPA). Es EL número que dice si el negocio cierra: si vender te deja $15 pero el CPA es $30, perdés plata. Necesita Pixel o Conversions API configurado en tu sitio.",
  },
  {
    id: "campaigns-table",
    title: "Tabla de campañas",
    desc:
      "Una fila por cada campaña que armaste en Meta. Los mismos KPIs desagregados. Buscá outliers: si una tiene CTR 0.4% cuando el resto tiene 2%, pausala o rehacela.",
  },
  {
    id: "agent-activity",
    title: "Actividad del agente",
    desc:
      "Cuando le des permiso a la IA para ajustar presupuestos, cada movimiento aparece acá con la delta y el motivo en palabras. Vos ves qué hizo, cuándo y por qué — y podés revertirlo.",
  },
];

const STORAGE_KEY = "dashboard-tour-seen-v1";

export function DashboardTour({ autoOpen = false }: { autoOpen?: boolean }) {
  const [step, setStep] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Auto-open on first visit if the dashboard is in preview mode.
  useEffect(() => {
    if (!autoOpen) return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTimeout(() => setStep(0), 250);
      }
    } catch {
      /* storage disabled, silently skip */
    }
  }, [autoOpen]);

  // Recompute the highlight rect whenever the step, viewport, or scroll change.
  useEffect(() => {
    if (step < 0) {
      setRect(null);
      return;
    }
    const compute = () => {
      const s = STEPS[step];
      if (!s?.id) {
        setRect(null);
        return;
      }
      const el = document.querySelector<HTMLElement>(`[data-tour="${s.id}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      setRect(el.getBoundingClientRect());
    };
    // Scroll target into view first so the highlight rect lands inside the viewport.
    const s = STEPS[step];
    if (s?.id) {
      const el = document.querySelector<HTMLElement>(`[data-tour="${s.id}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      // Wait for smooth scroll to finish before capturing the rect.
      const t = setTimeout(compute, 380);
      window.addEventListener("resize", compute);
      window.addEventListener("scroll", compute, { passive: true });
      return () => {
        clearTimeout(t);
        window.removeEventListener("resize", compute);
        window.removeEventListener("scroll", compute);
      };
    }
    compute();
  }, [step]);

  function close() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setStep(-1);
    setRect(null);
  }
  function next() {
    if (step >= STEPS.length - 1) close();
    else setStep(step + 1);
  }
  function prev() {
    if (step > 0) setStep(step - 1);
  }

  if (step < 0) {
    return (
      <button
        type="button"
        onClick={() => setStep(0)}
        className="text-[12px] hairline rounded-md px-3 py-1.5 hover:bg-[color:var(--color-surface-2)]"
        style={{ background: "var(--color-surface-1)", color: "var(--color-ink-muted)" }}
        title="Cómo leer el dashboard"
      >
        ¿Cómo lo leo?
      </button>
    );
  }

  const s = STEPS[step];
  const pad = 8;
  const hasRect = !!rect;
  const tip = computeTipPos(rect);

  return (
    <>
      {/* Full-screen click blocker (also darkens when there's no highlight). */}
      <div
        className="fixed inset-0 z-[9990]"
        style={{
          background: hasRect ? "transparent" : "rgba(20, 17, 16, 0.72)",
          transition: "background 0.35s ease",
          cursor: "pointer",
        }}
        onClick={next}
        aria-hidden
      />

      {/* Highlight ring — box-shadow "punches" a rectangle out of a huge dark shadow. */}
      {hasRect ? (
        <div
          className="fixed rounded-lg z-[9991] pointer-events-none"
          style={{
            top: rect!.top - pad,
            left: rect!.left - pad,
            width: rect!.width + pad * 2,
            height: rect!.height + pad * 2,
            boxShadow:
              "0 0 0 9999px rgba(20, 17, 16, 0.72), 0 0 0 2px color-mix(in oklab, var(--color-primary) 70%, transparent), 0 0 32px 6px color-mix(in oklab, var(--color-primary) 20%, transparent)",
            transition: "top 0.4s cubic-bezier(0.16, 1, 0.3, 1), left 0.4s cubic-bezier(0.16, 1, 0.3, 1), width 0.4s cubic-bezier(0.16, 1, 0.3, 1), height 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      ) : null}

      {/* Tooltip */}
      <div
        className="fixed z-[9992] w-[380px] max-w-[calc(100vw-32px)] p-5 hairline rounded-lg"
        style={{
          background: "var(--color-surface-1)",
          boxShadow: "0 12px 40px -8px rgba(0,0,0,0.35)",
          top: tip.top,
          left: tip.left,
          transform: tip.transform,
          transition: "top 0.35s cubic-bezier(0.16, 1, 0.3, 1), left 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={s.title}
      >
        <div
          className="flex items-center justify-between mb-3 text-[10px] tracking-[0.16em] uppercase"
          style={{ color: "var(--color-ink-subtle)" }}
        >
          <span>
            Paso {step + 1} de {STEPS.length}
          </span>
          <button type="button" onClick={close} className="hover:underline" style={{ color: "var(--color-ink-subtle)" }}>
            Saltar
          </button>
        </div>
        <h3
          className="mb-2 text-[19px] tracking-tight"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "-0.01em" }}
        >
          {s.title}
        </h3>
        <p className="mb-5 text-[13.5px] leading-[1.55]" style={{ color: "var(--color-ink-muted)" }}>
          {s.desc}
        </p>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 18 : 6,
                  height: 6,
                  background: i === step ? "var(--color-primary)" : i < step ? "color-mix(in oklab, var(--color-primary) 30%, transparent)" : "var(--color-hairline-strong)",
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={prev}
                className="hairline rounded-md px-3 py-1.5 text-[12px]"
                style={{ background: "var(--color-surface-2)", color: "var(--color-ink-muted)" }}
              >
                ← Atrás
              </button>
            ) : null}
            <button
              type="button"
              onClick={next}
              className="rounded-md px-4 py-1.5 text-[12px] font-medium"
              style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
            >
              {step === STEPS.length - 1 ? "Listo" : "Siguiente →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function computeTipPos(rect: DOMRect | null): { top: string; left: string; transform: string } {
  if (typeof window === "undefined") {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  if (!rect) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  const pad = 16;
  const tooltipW = 380;
  const tooltipHEst = 220;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const spaceBelow = vh - rect.bottom;
  const spaceAbove = rect.top;

  const top =
    spaceBelow >= tooltipHEst + pad || spaceBelow >= spaceAbove
      ? Math.min(vh - tooltipHEst - pad, rect.bottom + pad)
      : Math.max(pad, rect.top - tooltipHEst - pad);

  let left = rect.left + rect.width / 2 - tooltipW / 2;
  left = Math.max(pad, Math.min(vw - tooltipW - pad, left));

  return { top: `${top}px`, left: `${left}px`, transform: "none" };
}
