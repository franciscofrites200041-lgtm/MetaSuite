import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { openrouter } from "@/lib/ai/openrouter";
import { supabaseServer } from "@/lib/supabase/server";
import { DEFAULT_MODEL_ID } from "@/lib/models";
import { scrapeSite, type SiteDigest, type PageDigest } from "./scraper";
import { analyzePlace, type PlaceDigest } from "./places";

// End-to-end analysis. Called from a server action or API route right after
// a company is created. Runs synchronously — Qwen3.8 Flash is fast enough
// that we don't need a background queue for MVP. If the pipeline throws,
// we mark the row status='error' and store last_error.

const AnalysisSchema = z.object({
  brief_general_md: z.string().describe(
    "Brief general de la empresa en markdown, 200-500 palabras, con secciones: # Qué hace, # Público objetivo aparente, # Tono y voz, # Diferenciales / puntos fuertes, # Riesgos o áreas flojas"
  ),
  seo: z.object({
    score: z.number().int().min(0).max(100),
    summary: z.string().max(400),
    recommendations: z.array(z.object({
      title: z.string().max(90),
      why: z.string().max(220),
      fix: z.string().max(220),
    })).max(5),
  }),
  geo: z.object({
    score: z.number().int().min(0).max(100),
    summary: z.string().max(400),
    recommendations: z.array(z.object({
      title: z.string().max(90),
      why: z.string().max(220),
      fix: z.string().max(220),
    })).max(5),
  }),
});

export async function runCompanyAnalysis(companyId: string): Promise<void> {
  const supabase = await supabaseServer();
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, website_url, google_maps_url, has_physical_location, industry, description")
    .eq("id", companyId)
    .maybeSingle();
  if (!company) return;

  await supabase.from("company_analysis").upsert({
    company_id: companyId,
    status: "running",
    started_at: new Date().toISOString(),
    last_error: null,
  });

  try {
    if (!company.website_url) throw new Error("website_url_missing");

    // Fetch website + Places in parallel — both are network-bound.
    const [site, place] = await Promise.all([
      scrapeSite(company.website_url),
      company.has_physical_location && company.google_maps_url
        ? analyzePlace(company.google_maps_url)
        : Promise.resolve(null),
    ]);

    // If cheerio got nothing useful (SPA / bot-blocked / dead site), degrade
    // gracefully — the LLM works off the little we have and the DB record
    // still gets a status=complete plus a low SEO score.
    const context = buildContext(company, site, place);

    const { object } = await generateObject({
      model: openrouter(DEFAULT_MODEL_ID),
      schema: AnalysisSchema,
      system: SYSTEM,
      prompt: context,
    });

    await supabase.from("company_analysis").update({
      status: "complete",
      seo_score: object.seo.score,
      seo_summary: object.seo.summary,
      seo_recommendations: object.seo.recommendations,
      geo_score: place ? object.geo.score : null,
      geo_summary: place ? object.geo.summary : null,
      geo_recommendations: place ? object.geo.recommendations : null,
      place_id: place?.place_id ?? null,
      place_data: place ? (place as unknown as object) : null,
      scraped_urls: site.pages.map((p) => p.url),
      completed_at: new Date().toISOString(),
      last_error: site.errors.length ? site.errors.join(" | ").slice(0, 500) : null,
    }).eq("company_id", companyId);

    await supabase.from("companies").update({
      brief_general_md: object.brief_general_md,
      brief_general_updated_at: new Date().toISOString(),
    }).eq("id", companyId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    await supabase.from("company_analysis").update({
      status: "error",
      last_error: msg.slice(0, 500),
      completed_at: new Date().toISOString(),
    }).eq("company_id", companyId);
  }
}

const SYSTEM = `Sos un analista SEO/GEO senior. Escribís en español rioplatense, directo y sin adornos. Tu output es JSON estructurado — respetás el schema al pie de la letra.

- brief_general_md: tono editorial, prosa cortita, sin bullshit. Secciones con # markdown.
- seo.score: 0-100 basado en la calidad del site (title/meta, headings, schema.org, alt tags, structure).
- seo.recommendations: máximo 5, ordenadas por impacto. "why" explica el problema, "fix" es la acción concreta.
- geo.score: 0-100 basado en rating (>4.5 excelente), volumen de reviews (>200 es sólido, <10 es incipiente), completitud del perfil de Maps (fotos, horarios, teléfono).
- geo.recommendations: acciones concretas para mejorar el ranking local de Google.

Si un dato falta, deducí lo mejor que puedas del resto. NO inventes datos de reviews o rating si Places no los dio.`;

function buildContext(
  company: { name: string; industry: string | null; description: string | null; website_url: string; has_physical_location: boolean },
  site: SiteDigest,
  place: PlaceDigest | null
): string {
  const lines: string[] = [];
  lines.push(`# Empresa`);
  lines.push(`Nombre: ${company.name}`);
  lines.push(`Industria declarada: ${company.industry ?? "(sin declarar)"}`);
  lines.push(`Descripción declarada: ${company.description ?? "(sin declarar)"}`);
  lines.push(`Local físico: ${company.has_physical_location ? "sí" : "no (solo online)"}`);
  lines.push("");

  lines.push(`# Website (${site.origin})`);
  lines.push(`Páginas scrapeadas: ${site.pages.length}`);
  lines.push(`Sitemap: ${site.hasSitemap ? "presente" : "ausente"}. Robots.txt: ${site.hasRobotsTxt ? "presente" : "ausente"}.`);
  if (site.techHints.length) lines.push(`Tech hints: ${site.techHints.join(", ")}`);
  for (const p of site.pages) lines.push(pageBlock(p));
  if (site.errors.length) lines.push(`Errores de fetch: ${site.errors.join(" | ")}`);
  lines.push("");

  if (place) {
    lines.push(`# Google Maps / Places`);
    lines.push(`Nombre: ${place.displayName ?? "?"}`);
    lines.push(`Categorías: ${place.types.join(", ")}`);
    lines.push(`Dirección: ${place.address ?? "?"}`);
    lines.push(`Rating: ${place.rating ?? "?"} · ${place.userRatingCount ?? 0} reviews`);
    lines.push(`Fotos en el perfil: ${place.photoCount}`);
    lines.push(`Horarios: ${place.regularHours ?? "(no cargados)"}`);
    lines.push(`Teléfono: ${place.phone ?? "(no cargado)"}`);
    lines.push(`Sitio en el perfil: ${place.websiteUri ?? "(no cargado)"}`);
    if (place.latestReviews.length) {
      lines.push(`Últimas reviews:`);
      for (const r of place.latestReviews) lines.push(`  - [${r.rating}★] ${r.text}`);
    }
  } else if (company.has_physical_location) {
    lines.push(`# Google Maps / Places`);
    lines.push(`(sin datos — Google Maps URL no cargada o API key ausente. Marcar GEO como no evaluado si aplica.)`);
  } else {
    lines.push(`# Google Maps / Places`);
    lines.push(`(empresa solo-online — omitir análisis GEO, poner score 0 y summary "no aplica".)`);
  }

  return lines.join("\n");
}

function pageBlock(p: PageDigest): string {
  const lines: string[] = [];
  lines.push(`\n## Página: ${p.url}`);
  lines.push(`- title: ${p.title ?? "(vacío)"} · ${(p.title?.length ?? 0)} chars`);
  lines.push(`- meta description: ${p.metaDescription ?? "(vacío)"} · ${(p.metaDescription?.length ?? 0)} chars`);
  lines.push(`- H1 (${p.h1.length}): ${p.h1.slice(0, 3).join(" | ")}`);
  lines.push(`- H2 (${p.h2.length}): ${p.h2.slice(0, 3).join(" | ")}`);
  lines.push(`- schema.org: ${p.hasSchemaOrg ? p.schemaTypes.join(",") || "sí" : "no"}`);
  lines.push(`- images: ${p.imgCount} total, ${p.imgWithAltCount} con alt`);
  lines.push(`- texto (primeros ~1000 chars): ${p.bodyText.slice(0, 1000)}`);
  return lines.join("\n");
}
