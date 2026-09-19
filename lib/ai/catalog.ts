// Live OpenRouter catalog fetch. Server-only. Cached 1h by Next.js.
//
// Why fetch dynamically: OpenRouter has 400+ models, ships new ones weekly.
// A hardcoded list goes stale in days and cripples the selector. This function
// pulls the live catalog, filters to models we can actually use (tool calling
// is required — our orchestrator makes tool calls in every turn), and returns a
// compact shape for the UI.
//
// The upstream response schema is documented at
// https://openrouter.ai/docs/api-reference/list-available-models

import "server-only";
import type { Model } from "@/lib/models";

type RawModel = {
  id: string;
  name: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  supported_parameters?: string[];
  architecture?: { input_modalities?: string[] };
  benchmarks?: { artificial_analysis?: { intelligence_index?: number } };
};

// Providers we want to surface prominently. Everything else still shows up under
// its own group, sorted alphabetically after these.
const PROVIDER_ORDER = [
  "anthropic", "openai", "google", "x-ai", "meta-llama",
  "mistralai", "deepseek", "qwen", "moonshotai", "z-ai",
  "minimax", "cohere", "amazon", "nvidia",
];

const PROVIDER_LABEL: Record<string, Model["provider"]> = {
  "anthropic": "Anthropic",
  "openai": "OpenAI",
  "google": "Google",
  "x-ai": "xAI",
  "meta-llama": "Meta",
  "mistralai": "Mistral",
  "deepseek": "DeepSeek",
  "qwen": "Qwen",
  "moonshotai": "Moonshot",
  "z-ai": "Z.ai",
  "minimax": "MiniMax",
  "cohere": "Cohere",
  "amazon": "Amazon",
  "nvidia": "NVIDIA",
  "bytedance-seed": "ByteDance",
  "tencent": "Tencent",
  "stepfun": "StepFun",
  "inclusionai": "InclusionAI",
  "ibm-granite": "IBM",
  "upstage": "Upstage",
  "sakana": "Sakana",
  "thinkingmachines": "Thinking Machines",
  "poolside": "Poolside",
  "kwaipilot": "Kwai",
  "arcee-ai": "Arcee",
  "rekaai": "Reka",
  "aion-labs": "Aion",
  "inception": "Inception",
  "openrouter": "OpenRouter",
  "meituan": "Meituan",
  "relace": "Relace",
  "xiaomi": "Xiaomi",
  "sao10k": "Sao10k",
};

function formatPrice(usdPerToken: string | undefined): string | null {
  if (!usdPerToken) return null;
  const n = parseFloat(usdPerToken);
  if (!Number.isFinite(n) || n === 0) return null;
  const per1M = n * 1_000_000;
  if (per1M < 1) return `$${per1M.toFixed(2)}/M`;
  if (per1M < 10) return `$${per1M.toFixed(1)}/M`;
  return `$${per1M.toFixed(0)}/M`;
}

function providerFromId(id: string): { slug: string; label: Model["provider"] } {
  const slug = id.split("/")[0] ?? "other";
  const clean = slug.replace(/^~/, "");
  const label = (PROVIDER_LABEL[clean] ?? clean.charAt(0).toUpperCase() + clean.slice(1)) as Model["provider"];
  return { slug: clean, label };
}

/** Fetch OpenRouter's live catalog, cached for 1h on the server. */
export async function getModelCatalog(): Promise<Model[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    next: { revalidate: 3600 },
    // No auth required for the public catalog listing.
  });
  if (!res.ok) {
    console.error("[catalog] OpenRouter models fetch failed", res.status);
    return [];
  }
  const json = (await res.json()) as { data: RawModel[] };

  const filtered = json.data.filter((m) => {
    // Must support tool calling — our orchestrator calls tools every turn.
    if (!m.supported_parameters?.includes("tools")) return false;
    // Skip batch variants (async only, useless for chat) and free variants
    // (heavily rate-limited, users hit walls immediately).
    if (m.id.endsWith(":batch") || m.id.endsWith(":free")) return false;
    // Skip beta channel duplicates (~openai, ~anthropic, etc.).
    if (m.id.startsWith("~")) return false;
    return true;
  });

  const models: Model[] = filtered.map((m) => {
    const { slug, label } = providerFromId(m.id);
    const priceIn = formatPrice(m.pricing?.prompt);
    const priceOut = formatPrice(m.pricing?.completion);
    const ctx = m.context_length ? `${Math.round(m.context_length / 1000)}k` : null;
    const hintParts = [priceIn && priceOut ? `${priceIn} in / ${priceOut} out` : null, ctx].filter(Boolean);
    // Prefix the visible name so long OpenRouter names like "Anthropic: Claude Sonnet 4.6"
    // become "Claude Sonnet 4.6" — the provider is already in the optgroup.
    const shortLabel = m.name.replace(/^[^:]+:\s*/, "");
    return {
      id: m.id,
      label: shortLabel,
      hint: hintParts.join(" · "),
      provider: label,
      providerSlug: slug,
      intelligenceIndex: m.benchmarks?.artificial_analysis?.intelligence_index ?? null,
    };
  });

  // Sort: preferred providers first (in PROVIDER_ORDER order), then alpha by
  // provider label. Within a provider, best model (intelligence_index desc) first.
  const providerRank = (slug: string): number => {
    const idx = PROVIDER_ORDER.indexOf(slug);
    return idx === -1 ? 999 : idx;
  };
  models.sort((a, b) => {
    const pa = providerRank(a.providerSlug);
    const pb = providerRank(b.providerSlug);
    if (pa !== pb) return pa - pb;
    if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
    const ia = a.intelligenceIndex ?? -1;
    const ib = b.intelligenceIndex ?? -1;
    if (ia !== ib) return ib - ia;
    return a.label.localeCompare(b.label);
  });

  return models;
}
