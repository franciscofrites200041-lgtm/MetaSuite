import { createOpenAI } from "@ai-sdk/openai";

// OpenRouter exposes an OpenAI-compatible API. Vercel AI SDK's OpenAI provider
// works verbatim once we point the baseURL at it.
export const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  baseURL: "https://openrouter.ai/api/v1",
  // OpenRouter uses these headers for attribution and rate-limit routing.
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "Toruk AUGUR",
  },
});
