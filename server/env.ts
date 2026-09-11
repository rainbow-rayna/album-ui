import dotenv from "dotenv";

// Loaded before anything reads process.env. The server is the only process that
// ever sees these values — Vite is never given this file, so no provider key can
// end up in a browser bundle. (Vite only exposes vars prefixed `VITE_`, and
// nothing here is, which is a second reason the same .env stays safe.)
dotenv.config();

export const env = {
  apiPort: Number(process.env.API_PORT || 5185),
  anthropicApiKey: (process.env.ANTHROPIC_API_KEY || "").trim(),
  geminiApiKey: (process.env.GEMINI_API_KEY || "").trim(),
  openAiApiKey: (process.env.OPENAI_API_KEY || "").trim(),
  /**
   * Models are pinned rather than floating on a "-latest" alias: an alias that
   * gets retired or overloaded would silently turn every page into a fallback
   * with no obvious cause.
   */
  anthropicModel: (process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001").trim(),
  geminiModel: (process.env.GEMINI_MODEL || "gemini-3.1-flash-image").trim(),
  openAiImageModel: (process.env.OPENAI_IMAGE_MODEL || "gpt-image-1").trim(),
  isProduction: process.env.NODE_ENV === "production",
};

export const hasAnthropic = () => env.anthropicApiKey.length > 0;
export const hasGemini = () => env.geminiApiKey.length > 0;
export const hasOpenAi = () => env.openAiApiKey.length > 0;
