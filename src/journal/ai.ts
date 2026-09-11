import type {
  AiStatus,
  ChatResponse,
  ImageProvider,
  ImageRequest,
  ImageResponse,
  SummaryResponse,
} from '../../shared/ai';
import type { ChatMessage, Family, JournalEntry } from './types';

/**
 * Client half of the AI layer.
 *
 * There are no API keys in this file, and no provider URLs — the browser posts
 * to our own `/api/ai/*` routes (proxied by Vite to the Express server) and the
 * server, which is the only process that reads `.env`, makes the upstream call.
 * See `server/services/` for the other half, and `.env.example` for setup.
 */

export type { ImageProvider };

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error((detail as { error?: string } | null)?.error || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

/**
 * Which providers the server has keys for. The browser only ever sees these
 * booleans — never the keys themselves. Returns everything-off if the API is
 * unreachable, which is the correct read: nothing AI-backed will work.
 */
export async function fetchAiStatus(): Promise<AiStatus> {
  try {
    const res = await fetch('/api/ai/status');
    if (!res.ok) throw new Error(`status ${res.status}`);
    return (await res.json()) as AiStatus;
  } catch (err) {
    console.warn('Could not reach the album API — AI features are off.', err);
    return { anthropic: false, gemini: false, openai: false };
  }
}

export async function getAiReply(chatMessages: ChatMessage[]): Promise<{ reply: string; warning?: string }> {
  try {
    const data = await postJson<ChatResponse>('/api/ai/chat', { messages: chatMessages });
    return { reply: data.reply, warning: data.warning };
  } catch (err) {
    console.warn('Chat request failed', err);
    return {
      reply: "What's the story behind this?",
      warning: "Couldn't reach the album API just now — using a scripted prompt instead.",
    };
  }
}

export async function getAiSummaryAndMood(
  chatMessages: ChatMessage[],
): Promise<{ text: string; mood: Family; caption: string; captionAuthor?: string; warning?: string }> {
  const userText = chatMessages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ');
  try {
    const data = await postJson<SummaryResponse>('/api/ai/summary', { messages: chatMessages });
    return {
      text: data.text,
      mood: data.mood,
      caption: data.caption,
      captionAuthor: data.captionAuthor,
      warning: data.warning,
    };
  } catch (err) {
    console.warn('Summary request failed', err);
    return {
      text: userText,
      mood: 'scatter',
      caption: '',
      warning: "Couldn't reach the album API — kept your own words as the entry.",
    };
  }
}

/**
 * Asks the server to render the page image. Throws on failure so the composer
 * can fall back to its local CSS layout, exactly as it did when the providers
 * were called from the browser.
 */
export async function generatePageImage(
  entry: JournalEntry,
  detectedFamily: Family | null,
  provider?: ImageProvider,
): Promise<ImageResponse> {
  const payload: ImageRequest = {
    entry: {
      photos: entry.photos,
      text: entry.text,
      caption: entry.caption,
      captionAuthor: entry.captionAuthor,
      family: entry.layoutSpec ? entry.layoutSpec.family : detectedFamily || 'scatter',
    },
    provider,
  };
  return postJson<ImageResponse>('/api/ai/image', payload);
}
