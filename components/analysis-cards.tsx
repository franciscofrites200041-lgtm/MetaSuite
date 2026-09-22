"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Recommendation = { title: string; why: string; fix: string };

export type AnalysisRow = {
  status: "pending" | "running" | "complete" | "error";
  seo_score: number | null;
  seo_summary: string | null;
  seo_recommendations: Recommendation[] | null;
  geo_score: number | null;
  geo_summary: string | null;
  geo_recommendations: Recommendation[] | null;
  last_error: string | null;
  brief_general_md: string | null;
  has_physical_location: boolean;
};

// Three cards + short brief. Polls the server component every 4s while the
// analysis is running so the UI flips to "complete" without a manual reload.
export function AnalysisCards({ slug, initial }: { slug: string; initial: AnalysisRow }) {
  const router = useRouter();
  const [row] = useState(initial);
  const isRunning = row.status === "pending" || row.status === "running";

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(id);
  }, [isRunning, router]);

  if (row.status === "error") {
    return (
      <div className="mb-8 hairline rounded-lg p-4" style={{ background: "color-mix(in oklab, var(--color-danger) 6%, var(--color-surface-1))" }}>
        <div className="text-[13px]" style={{ color: "var(--color-danger)" }}>
          El análisis falló. {row.last_error ? <span style={{ color: "var(--color-ink-muted)" }}>· {row.last_error}</span> : null}
        </div>
      </div>
    );
  }

  if (isRunning) {
    return (
      <div className="mb-8 hairline rounded-lg p-5 thinking-sheen" style={{ background: "var(--color-ai-surface)" }}>
        <div className="text-[10px] tracking-[0.16em] uppercase mb-1" style={{ color: "var(--color-ink-subtle)" }}>
          En análisis
        </div>
        <div className="text-[14px]" style={{ color: "var(--color-ink)" }}>
          La IA está leyendo tu sitio y el perfil de Google Maps. Suele tardar entre 10 y 30 segundos.
        </div>
      </div>
    );
  }

  return (
    <div className="mb-10">
      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <ScoreCard title="Brief general" body={row.brief_general_md} kind="brief" />
        <ScoreCard title="SEO" score={row.seo_score} summary={row.seo_summary} recs={row.seo_recommendations} />
        <ScoreCard
          title="GEO"
          score={row.has_physical_location ? row.geo_score : null}
          summary={row.has_physical_location ? row.geo_summary : "Empresa 100% online — sin análisis GEO."}
          recs={row.has_physical_location ? row.geo_recommendations : null}
          muted={!row.has_physical_location}
        />
      </div>
      <div className="text-right">
        <Link href={`/app/c/${slug}/analysis`} className="text-[12px] underline" style={{ color: "var(--color-ink-muted)" }}>
          Ver análisis completo →
        </Link>
      </div>
    </div>
  );
}

function ScoreCard({
  title,
  score,
  summary,
  recs,
  body,
  kind,
  muted,
}: {
  title: string;
  score?: number | null;
  summary?: string | null;
  recs?: Recommendation[] | null;
  body?: string | null;
  kind?: "brief";
  muted?: boolean;
}) {
  const scoreColor = score === null || score === undefined
    ? "var(--color-ink-tertiary)"
    : score >= 75 ? "var(--color-success)"
    : score >= 50 ? "var(--color-warning)"
    : "var(--color-danger)";

  return (
    <div className="hairline rounded-lg p-4 flex flex-col" style={{ background: "var(--color-surface-1)", opacity: muted ? 0.6 : 1 }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] tracking-wider uppercase" style={{ color: "var(--color-primary)" }}>{title}</span>
        {typeof score === "number" ? (
          <span className="text-[13px]" style={{ color: scoreColor, fontFamily: "var(--font-mono)" }}>{score}/100</span>
        ) : null}
      </div>
      {kind === "brief" ? (
        <div className="text-[12.5px] leading-[1.55] line-clamp-6" style={{ color: "var(--color-ink-muted)" }}>
          {body ? stripMd(body) : "La IA todavía no generó el brief general."}
        </div>
      ) : (
        <>
          <div className="text-[12.5px] leading-[1.5] mb-2" style={{ color: "var(--color-ink)" }}>
            {summary ?? "Sin resumen."}
          </div>
          {recs && recs.length > 0 ? (
            <ul className="text-[11.5px] space-y-1" style={{ color: "var(--color-ink-muted)" }}>
              {recs.slice(0, 2).map((r, i) => (
                <li key={i} className="flex gap-1.5">
                  <span style={{ color: "var(--color-primary)" }}>·</span>
                  <span className="truncate">{r.title}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}

function stripMd(s: string): string {
  return s.replace(/[#*_`>\-]/g, "").replace(/\s+/g, " ").trim();
}
