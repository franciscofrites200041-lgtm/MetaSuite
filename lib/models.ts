// Model type shared between server (catalog fetch) and client (selector UI).
// The live list comes from lib/ai/catalog.ts — do NOT hardcode models here.

export type Model = {
  id: string;              // OpenRouter slug, e.g. "anthropic/claude-sonnet-4.6"
  label: string;           // Display name, e.g. "Claude Sonnet 4.6"
  hint: string;            // e.g. "$3/M in / $15/M out · 1000k"
  provider: string;        // Display provider, e.g. "Anthropic"
  providerSlug: string;    // Raw slug, e.g. "anthropic"
  intelligenceIndex: number | null;
};

// Hardcoded default. UI no longer lets the user switch — the model is a
// product decision, not user config. Qwen3.8 Flash is fast, cheap, and
// supports tool calling on OpenRouter.
export const DEFAULT_MODEL_ID = "qwen/qwen3.8-flash";
