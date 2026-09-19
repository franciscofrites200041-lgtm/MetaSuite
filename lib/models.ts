// Curated list of OpenRouter models available in the chat selector.
// See spec § 8. Grouped by provider for the dropdown.
// Ponytail: static list, upgrade to a dynamic fetch of /api/v1/models when the
// list starts feeling too tight or model IDs move around.

export type Model = {
  id: string;
  label: string;
  hint: string;
  provider: "Anthropic" | "OpenAI" | "Google" | "Meta" | "Mistral" | "DeepSeek" | "xAI" | "Qwen";
};

export const MODELS: Model[] = [
  // Anthropic — mejor razonamiento y voz
  { id: "anthropic/claude-opus-4.7", label: "Claude Opus 4.7", hint: "Máxima calidad. Caro.", provider: "Anthropic" },
  { id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6", hint: "Equilibrio calidad/costo. Default.", provider: "Anthropic" },
  { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5", hint: "Rápido y barato para tareas simples.", provider: "Anthropic" },
  { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5", hint: "Generación anterior, sólido.", provider: "Anthropic" },

  // OpenAI
  { id: "openai/gpt-5", label: "GPT-5", hint: "Fuerte en razonamiento estructurado.", provider: "OpenAI" },
  { id: "openai/gpt-5-mini", label: "GPT-5 mini", hint: "Barato, buena relación calidad/precio.", provider: "OpenAI" },
  { id: "openai/gpt-5-nano", label: "GPT-5 nano", hint: "Ultra barato, tareas simples.", provider: "OpenAI" },
  { id: "openai/gpt-4.1", label: "GPT-4.1", hint: "Anterior, estable y capaz.", provider: "OpenAI" },
  { id: "openai/o4-mini", label: "o4-mini", hint: "Reasoning económico.", provider: "OpenAI" },

  // Google
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "Bueno en creativo, contexto largo.", provider: "Google" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", hint: "Rápido y muy barato.", provider: "Google" },
  { id: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash", hint: "Alternativa liviana.", provider: "Google" },

  // Meta (open weights)
  { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick", hint: "Open weights, top de línea Meta.", provider: "Meta" },
  { id: "meta-llama/llama-4-scout", label: "Llama 4 Scout", hint: "Open weights, más liviano.", provider: "Meta" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", hint: "Estable, económico.", provider: "Meta" },

  // Mistral
  { id: "mistralai/mistral-large-2411", label: "Mistral Large", hint: "Top de Mistral, buen francés/español.", provider: "Mistral" },
  { id: "mistralai/mistral-medium-3", label: "Mistral Medium 3", hint: "Balanceado.", provider: "Mistral" },

  // DeepSeek — muy buena relación calidad/precio
  { id: "deepseek/deepseek-v3.1", label: "DeepSeek V3.1", hint: "Generalista muy barato.", provider: "DeepSeek" },
  { id: "deepseek/deepseek-r1", label: "DeepSeek R1", hint: "Reasoning open. Muy barato.", provider: "DeepSeek" },

  // xAI
  { id: "x-ai/grok-4", label: "Grok 4", hint: "Fuerte en razonamiento, tono directo.", provider: "xAI" },
  { id: "x-ai/grok-4-fast", label: "Grok 4 Fast", hint: "Versión rápida y económica.", provider: "xAI" },

  // Qwen (Alibaba, open weights)
  { id: "qwen/qwen3-max", label: "Qwen3 Max", hint: "Top de Qwen, multilingüe.", provider: "Qwen" },
  { id: "qwen/qwen3-coder", label: "Qwen3 Coder", hint: "Especializado en código.", provider: "Qwen" },
];

export const DEFAULT_MODEL_ID = "anthropic/claude-sonnet-4.6";
