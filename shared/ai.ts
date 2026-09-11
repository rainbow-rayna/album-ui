/**
 * The wire contract between the browser and our own Express API.
 *
 * The browser never talks to Anthropic/Gemini/OpenAI directly any more — it
 * posts to `/api/ai/*` and the server, which is the only process that has the
 * keys, makes the upstream call. These types are the whole of what crosses that
 * boundary, so both sides can be typechecked against one definition.
 */

export type Family = "scatter" | "grid" | "filmstrip" | "circles";

export type ImageProvider = "gemini" | "openai";

/**
 * Which providers may draw a page. Product rule: a page with the user's own
 * photos is drawn by Gemini only — those photos are never sent to OpenAI —
 * while a page without photos may be drawn by either (the server picks one at
 * random for variety, falling back to the other if it fails). Shared so the
 * server's choice and the browser's "can this page be drawn?" checks agree.
 */
export function imageProvidersFor(photoCount: number): ImageProvider[] {
  return photoCount > 0 ? ["gemini"] : ["gemini", "openai"];
}

/** Which upstream providers have a key configured, as reported by the server. */
export interface AiStatus {
  /** Anthropic: real chat replies + journal summaries (else scripted prompts). */
  anthropic: boolean;
  /** Gemini: AI-rendered scrapbook-collage page. */
  gemini: boolean;
  /** OpenAI: AI-rendered minimal-zine-poster page. */
  openai: boolean;
}

export interface WireChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Whether a response came from a real model or from the local fallback bank.
 * The UI surfaces this rather than guessing from the absence of a key, which it
 * can no longer see.
 */
export type AiSource = "ai" | "fallback";

export interface ChatRequest {
  messages: WireChatMessage[];
}

export interface ChatResponse {
  reply: string;
  source: AiSource;
  /** Set when a real call was attempted and failed, so the UI can say so. */
  warning?: string;
}

export interface SummaryRequest {
  messages: WireChatMessage[];
}

export interface SummaryResponse {
  text: string;
  mood: Family;
  caption: string;
  captionAuthor?: string;
  source: AiSource;
  warning?: string;
}

/**
 * The slice of a JournalEntry the image routes actually need. Deliberately not
 * the whole entry: `layoutSpec` is purely a client-side rendering concern, and
 * `photos` (base64 data URLs) already make this the largest payload in the app.
 */
export interface ImageEntryInput {
  photos: string[];
  text: string;
  caption: string;
  captionAuthor?: string;
  family: Family;
}

export interface ImageRequest {
  entry: ImageEntryInput;
  /**
   * Prefer a provider. Only honoured if imageProvidersFor() allows it for
   * this page — it can't send the user's photos to OpenAI. Omit to follow
   * the normal order, which is what the app does.
   */
  provider?: ImageProvider;
}

export interface ImageResponse {
  /** A `data:image/...;base64,...` URL, ready to drop straight into an <img>. */
  image: string;
  provider: ImageProvider;
  /** Set when the first-choice provider failed and another one produced this. */
  warning?: string;
}

export interface ApiErrorBody {
  error: string;
}
