// Curated list of OpenRouter models available in the chat selector.
// See spec § 8 — the AI-conversation model is chosen by the user;
// sub-agents can be pinned server-side to different models.
export type Model = {
  id: string;
  label: string;
  hint: string;
  provider: "anthropic" | "openai" | "google" | "meta" | "mistral";
};

export const MODELS: Model[] = [
  { id: "anthropic/claude-opus-4-7", label: "Claude Opus 4.7", hint: "Máxima calidad. Más caro.", provider: "anthropic" },
  { id: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6", hint: "Equilibrio calidad/costo. Default.", provider: "anthropic" },
  { id: "openai/gpt-5", label: "GPT-5", hint: "Fuerte en razonamiento.", provider: "openai" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "Bueno para creativo.", provider: "google" },
  { id: "meta-llama/llama-3.3-70b", label: "Llama 3.3 70B", hint: "Costo bajo, open weights.", provider: "meta" },
];

export const DEFAULT_MODEL_ID = "anthropic/claude-sonnet-4-6";
