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

// Sensible default that supports tool calling and is fast. Verified live in
// OpenRouter catalog. If it disappears the /api/chat route falls back to
// whatever is first in the fetched catalog.
export const DEFAULT_MODEL_ID = "anthropic/claude-sonnet-4.6";
