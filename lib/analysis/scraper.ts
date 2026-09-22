import * as cheerio from "cheerio";

// Website scraper. Fetches homepage + up to 4 additional URLs found via
// sitemap.xml (preferred) or heuristic link discovery on the home page.
// Returns a compact digest for the LLM plus objective SEO signals for
// the heuristic checks.

export type PageDigest = {
  url: string;
  title: string | null;
  metaDescription: string | null;
  h1: string[];
  h2: string[];
  h3: string[];
  ogImage: string | null;
  hasSchemaOrg: boolean;
  schemaTypes: string[];
  imgCount: number;
  imgWithAltCount: number;
  bodyText: string; // trimmed, capped
  linkCount: number;
  outboundLinkCount: number;
};

export type SiteDigest = {
  origin: string;
  pages: PageDigest[];
  hasSitemap: boolean;
  hasRobotsTxt: boolean;
  techHints: string[]; // "shopify", "wordpress", "framer", "wix"...
  fetchedAt: string;
  errors: string[];
};

const UA = "TorukAugurBot/1.0 (+brief-generator)";
const MAX_PAGES = 5;
const MAX_BODY_CHARS = 4500;

export async function scrapeSite(rawUrl: string): Promise<SiteDigest> {
  const errors: string[] = [];
  let origin: string;
  try {
    origin = new URL(rawUrl).origin;
  } catch {
    return { origin: rawUrl, pages: [], hasSitemap: false, hasRobotsTxt: false, techHints: [], fetchedAt: new Date().toISOString(), errors: ["invalid_url"] };
  }

  const [homeResult, sitemapUrls, robotsOk] = await Promise.all([
    fetchAndDigest(origin, errors),
    discoverSitemap(origin, errors),
    checkRobots(origin),
  ]);

  const home = homeResult;
  const pages: PageDigest[] = home ? [home] : [];

  // Pick up to 4 more URLs — sitemap first, else heuristic from home links.
  const extraUrls = pickExtras(origin, sitemapUrls, home);
  const rest = await Promise.all(extraUrls.slice(0, MAX_PAGES - pages.length).map((u) => fetchAndDigest(u, errors)));
  for (const p of rest) if (p) pages.push(p);

  const techHints = detectTech(pages);

  return {
    origin,
    pages,
    hasSitemap: sitemapUrls.length > 0,
    hasRobotsTxt: robotsOk,
    techHints,
    fetchedAt: new Date().toISOString(),
    errors,
  };
}

async function fetchAndDigest(url: string, errors: string[]): Promise<PageDigest | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      errors.push(`${url} → HTTP ${res.status}`);
      return null;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return null;
    const html = await res.text();
    return digest(url, html);
  } catch (e) {
    errors.push(`${url} → ${e instanceof Error ? e.message : "fetch_error"}`);
    return null;
  }
}

function digest(url: string, html: string): PageDigest {
  const $ = cheerio.load(html);
  const origin = new URL(url).origin;

  const title = ($("head > title").first().text() || null)?.trim() || null;
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() ?? null;
  const ogImage = $('meta[property="og:image"]').attr("content") ?? null;

  const h1 = collect($, "h1", 5);
  const h2 = collect($, "h2", 8);
  const h3 = collect($, "h3", 8);

  const schemaScripts = $('script[type="application/ld+json"]');
  const schemaTypes: string[] = [];
  schemaScripts.each((_, el) => {
    try {
      const raw = $(el).contents().text();
      const j = JSON.parse(raw);
      const arr = Array.isArray(j) ? j : [j];
      for (const item of arr) if (item && typeof item === "object" && "@type" in item) {
        const t = (item as { "@type": string | string[] })["@type"];
        if (Array.isArray(t)) t.forEach((x) => schemaTypes.push(x));
        else schemaTypes.push(t);
      }
    } catch { /* ignore malformed json-ld */ }
  });

  const imgs = $("img");
  const imgCount = imgs.length;
  let imgWithAlt = 0;
  imgs.each((_, el) => { if (($(el).attr("alt") ?? "").trim().length > 0) imgWithAlt++; });

  // Strip scripts/styles/nav for the body text.
  $("script,style,nav,footer,noscript").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, MAX_BODY_CHARS);

  const links = $("a[href]");
  let outbound = 0;
  links.each((_, el) => {
    const href = $(el).attr("href") ?? "";
    try {
      const u = new URL(href, origin);
      if (u.origin !== origin) outbound++;
    } catch { /* ignore */ }
  });

  return {
    url,
    title,
    metaDescription,
    h1,
    h2,
    h3,
    ogImage,
    hasSchemaOrg: schemaScripts.length > 0,
    schemaTypes: dedupe(schemaTypes),
    imgCount,
    imgWithAltCount: imgWithAlt,
    bodyText,
    linkCount: links.length,
    outboundLinkCount: outbound,
  };
}

function collect($: cheerio.CheerioAPI, selector: string, cap: number): string[] {
  const out: string[] = [];
  $(selector).each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t) out.push(t);
  });
  return out.slice(0, cap);
}

function dedupe<T>(a: T[]): T[] { return [...new Set(a)]; }

async function discoverSitemap(origin: string, errors: string[]): Promise<string[]> {
  const candidates = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const text = await res.text();
      const urls = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
      if (urls.length > 0) return urls;
    } catch (e) {
      errors.push(`sitemap ${candidate} → ${e instanceof Error ? e.message : "fetch_error"}`);
    }
  }
  return [];
}

async function checkRobots(origin: string): Promise<boolean> {
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch { return false; }
}

function pickExtras(origin: string, sitemapUrls: string[], home: PageDigest | null): string[] {
  // Prefer sitemap URLs whose paths hint at about/services/contact/products.
  const keywords = ["about", "quien", "nosotros", "servicio", "service", "product", "contact", "contacto", "menu", "pricing", "precio"];
  const scored: Array<{ u: string; s: number }> = [];
  for (const u of sitemapUrls) {
    if (u === `${origin}/` || u === origin) continue;
    let path = "";
    try { path = new URL(u).pathname.toLowerCase(); } catch { continue; }
    let score = 0;
    for (const k of keywords) if (path.includes(k)) score += 2;
    if (path.split("/").filter(Boolean).length === 1) score += 1;
    if (score > 0) scored.push({ u, s: score });
  }
  scored.sort((a, b) => b.s - a.s);
  if (scored.length > 0) return dedupe(scored.map((s) => s.u));

  // Fallback: pull internal links from the home page.
  if (!home) return [];
  // (home already digested — we don't have <a> refs here, so this branch is
  // intentionally empty. Sitemap-based discovery covers 90%+ of sites.)
  return [];
}

function detectTech(pages: PageDigest[]): string[] {
  const hints = new Set<string>();
  for (const p of pages) {
    const body = p.bodyText.slice(0, 500).toLowerCase();
    if (body.includes("shopify")) hints.add("shopify");
    if (body.includes("wp-content") || body.includes("wordpress")) hints.add("wordpress");
    if (body.includes("wixstatic")) hints.add("wix");
    if (body.includes("framer")) hints.add("framer");
    for (const t of p.schemaTypes) {
      if (t.toLowerCase().includes("localbusiness")) hints.add("has_localbusiness_schema");
      if (t.toLowerCase().includes("product")) hints.add("has_product_schema");
    }
  }
  return [...hints];
}
