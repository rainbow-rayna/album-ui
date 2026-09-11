import { Router } from "express";
import { hasAnthropic, hasGemini, hasOpenAi } from "../env";
import { getChatReply, getSummaryAndMood } from "../services/anthropic";
import { generateCollagePage } from "../services/gemini";
import { generateZinePage } from "../services/openai";
import { imageProvidersFor } from "../../shared/ai";
import type {
  AiStatus,
  ChatRequest,
  ImageProvider,
  ImageRequest,
  ImageResponse,
  SummaryRequest,
  WireChatMessage,
} from "../../shared/ai";

export const aiRouter = Router();

function readMessages(body: unknown): WireChatMessage[] {
  const raw = (body as ChatRequest | SummaryRequest | undefined)?.messages;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is WireChatMessage => !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content }));
}

/**
 * What the browser is allowed to know about the keys: whether each provider is
 * configured, never the values. This is what drives the composer's "real AI is
 * on" note and its choice of preview copy.
 */
aiRouter.get("/status", (_req, res) => {
  const status: AiStatus = { anthropic: hasAnthropic(), gemini: hasGemini(), openai: hasOpenAi() };
  res.json(status);
});

aiRouter.post("/chat", async (req, res, next) => {
  try {
    const messages = readMessages(req.body);
    if (messages.length === 0) return res.status(400).json({ error: "messages must be a non-empty array" });
    res.json(await getChatReply(messages));
  } catch (err) {
    next(err);
  }
});

aiRouter.post("/summary", async (req, res, next) => {
  try {
    const messages = readMessages(req.body);
    if (messages.length === 0) return res.status(400).json({ error: "messages must be a non-empty array" });
    res.json(await getSummaryAndMood(messages));
  } catch (err) {
    next(err);
  }
});

const isConfigured = (p: ImageProvider) => (p === "gemini" ? hasGemini() : hasOpenAi());

/**
 * The providers to try for this page, in order. Only those imageProvidersFor()
 * allows — a page with the user's photos goes to Gemini alone — and only those
 * with a key configured. When two are allowed (no photos), the order is random
 * so pages get visual variety (scrapbook collage vs. minimal zine poster), and
 * the second is the fallback if the first fails.
 */
function orderProviders(photoCount: number, requested?: ImageProvider): ImageProvider[] {
  const allowed = imageProvidersFor(photoCount).filter(isConfigured);
  if (requested && allowed.includes(requested)) {
    return [requested, ...allowed.filter((p) => p !== requested)];
  }
  if (allowed.length < 2) return allowed;
  // Shuffle so neither provider is systematically the default.
  return Math.random() < 0.5 ? allowed : [...allowed].reverse();
}

const providerLabel = (p: ImageProvider) => (p === "gemini" ? "Gemini" : "OpenAI");

aiRouter.post("/image", async (req, res, next) => {
  try {
    const { entry, provider } = (req.body || {}) as ImageRequest;
    if (!entry || !Array.isArray(entry.photos)) {
      return res.status(400).json({ error: "entry with a photos array is required" });
    }

    const order = orderProviders(entry.photos.length, provider);
    if (order.length === 0) {
      // Not an error: the client renders its own CSS layout in this case.
      return res.status(503).json({
        error:
          entry.photos.length > 0
            ? "Pages with photos are drawn with Gemini, and GEMINI_API_KEY isn't set on the server."
            : "No image provider is configured on the server.",
      });
    }

    const failures: string[] = [];
    for (let i = 0; i < order.length; i++) {
      const current = order[i];
      try {
        // Any photographed frame the model draws around the page (margin,
        // tabletop, second sheet) is trimmed off in the browser — see
        // src/journal/flattenPage.ts — so the raw render is returned as-is.
        const image = current === "gemini" ? await generateCollagePage(entry) : await generateZinePage(entry);
        const payload: ImageResponse = { image, provider: current };
        if (i > 0) {
          payload.warning = `${providerLabel(order[0])} was unavailable, so this page was generated with ${providerLabel(current)} instead.`;
        }
        return res.json(payload);
      } catch (err) {
        const message = (err as Error)?.message || "Unknown error";
        console.error(`[api] image generation failed with ${current}:`, message);
        failures.push(`${providerLabel(current)}: ${message}`);
      }
    }

    res.status(502).json({ error: `Couldn't generate the AI page (${failures.join(" — ")})` });
  } catch (err) {
    next(err);
  }
});
