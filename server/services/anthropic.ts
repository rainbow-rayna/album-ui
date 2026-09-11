import { env, hasAnthropic } from "../env";
import {
  ANTHROPIC_URL,
  CHAT_SYSTEM_PROMPT,
  FALLBACK_CAPTIONS,
  FALLBACK_QUESTIONS,
  MOOD_KEYWORDS,
  SUMMARY_SYSTEM_PROMPT,
  ZINE_SKILL_SYSTEM_PROMPT,
} from "../prompts";
import { dataUrlToParts } from "../lib/dataUrl";
import type { ChatResponse, Family, ImageEntryInput, SummaryResponse, WireChatMessage } from "../../shared/ai";

/**
 * Anthropic calls, server-side only.
 *
 * The key never leaves this process — the browser posts to our own Express
 * routes, which is what talks to api.anthropic.com. There is no client-side
 * path to any provider anywhere in this app.
 *
 * Every failure mode (no key, network error, empty response) lands on the local
 * fallback bank and is reported to the client as `source: "fallback"`, so the
 * UI can say so honestly rather than passing scripted text off as AI output.
 */

function anthropicHeaders() {
  return {
    "content-type": "application/json",
    "x-api-key": env.anthropicApiKey,
    "anthropic-version": "2023-06-01",
  };
}

interface AnthropicContentBlock {
  text?: string;
}

async function callAnthropic(body: Record<string, unknown>): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: anthropicHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`);
  }
  const data = (await res.json()) as { content?: AnthropicContentBlock[] };
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("Empty response from Anthropic");
  return text.trim();
}

export function detectFamilyFromText(text: string): Family {
  const t = (text || "").toLowerCase();
  const score: Record<string, number> = { scatter: 0, grid: 0, filmstrip: 0, circles: 0 };
  (Object.keys(MOOD_KEYWORDS) as (keyof typeof MOOD_KEYWORDS)[]).forEach((fam) => {
    MOOD_KEYWORDS[fam].forEach((k) => {
      if (t.includes(k)) score[fam]++;
    });
  });
  let best: Family = "scatter";
  let bestScore = 0;
  (Object.keys(score) as Family[]).forEach((fam) => {
    if (score[fam] > bestScore) {
      best = fam;
      bestScore = score[fam];
    }
  });
  return bestScore > 0 ? best : "scatter";
}

function fallbackCaptionFor(mood: Family): { caption: string; captionAuthor?: string } {
  const options = FALLBACK_CAPTIONS[mood] || FALLBACK_CAPTIONS.scatter;
  const chosen = options[Math.floor(Math.random() * options.length)];
  return { caption: chosen.text, captionAuthor: chosen.author };
}

/**
 * Which scripted question to use, derived from how far the conversation has got
 * rather than a module-level counter. Keeping this stateless means "Restart
 * chat" starts over at the first question again without the client needing to
 * tell the server anything.
 */
function fallbackQuestionFor(messages: WireChatMessage[]): string {
  const turn = messages.filter((m) => m.role === "user").length;
  return FALLBACK_QUESTIONS[Math.max(0, turn - 1) % FALLBACK_QUESTIONS.length];
}

export async function getChatReply(messages: WireChatMessage[]): Promise<ChatResponse> {
  if (!hasAnthropic()) {
    return { reply: fallbackQuestionFor(messages), source: "fallback" };
  }
  try {
    const reply = await callAnthropic({
      model: env.anthropicModel,
      max_tokens: 150,
      system: CHAT_SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    return { reply, source: "ai" };
  } catch (err) {
    console.warn("[api] chat reply failed, using scripted fallback:", err);
    return {
      reply: fallbackQuestionFor(messages),
      source: "fallback",
      warning: "Had trouble reaching the AI just now — using a scripted prompt instead.",
    };
  }
}

export async function getSummaryAndMood(messages: WireChatMessage[]): Promise<SummaryResponse> {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");

  if (hasAnthropic()) {
    try {
      const raw = await callAnthropic({
        model: env.anthropicModel,
        max_tokens: 320,
        system: SUMMARY_SYSTEM_PROMPT,
        messages: [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: "Please write my journal entry now based on everything I shared." },
        ],
      });

      const moodMatch = raw.match(/MOOD:\s*(scatter|grid|filmstrip|circles)/i);
      const captionMatch = raw.match(/CAPTION:\s*([\s\S]*?)(?:\n\s*AUTHOR:|$)/i);
      const authorMatch = raw.match(/AUTHOR:\s*(.*)$/im);
      const mood: Family = moodMatch ? (moodMatch[1].toLowerCase() as Family) : detectFamilyFromText(userText);
      const fallback = fallbackCaptionFor(mood);

      let caption = captionMatch ? captionMatch[1].trim() : fallback.caption;
      // Defensive cleanup: the model occasionally self-labels its chosen form (e.g. "Title: ...")
      // even when told not to - strip that and any surrounding quotes.
      caption = caption
        .replace(/^(title|caption|phrase|poem|headline|quote|saying|proverb)\s*:\s*/i, "")
        .replace(/^["“'](.*)["”']$/s, "$1")
        .trim();
      const authorRaw = authorMatch ? authorMatch[1].trim() : "";
      const captionAuthor =
        authorRaw && !/^none$/i.test(authorRaw)
          ? authorRaw.replace(/^["“'](.*)["”']$/s, "$1").trim()
          : fallback.captionAuthor;

      let text = raw
        .replace(/CAPTION:[\s\S]*$/i, "")
        .replace(/MOOD:\s*(scatter|grid|filmstrip|circles)\s*$/im, "")
        .trim();
      // Defensive cleanup: strip an accidental leading title/heading line if the model adds one anyway.
      text = text
        .replace(/^#{1,6}\s*.*$/m, "")
        .replace(/^\**\s*(title|heading)\s*:\s*.*$/im, "")
        .trim();

      return {
        text: text || userText,
        mood,
        caption: caption || fallback.caption,
        captionAuthor: caption ? captionAuthor : fallback.captionAuthor,
        source: "ai",
      };
    } catch (err) {
      console.warn("[api] summary failed, using plain fallback:", err);
      const mood = detectFamilyFromText(userText);
      const fallback = fallbackCaptionFor(mood);
      return {
        text: userText,
        mood,
        caption: fallback.caption,
        captionAuthor: fallback.captionAuthor,
        source: "fallback",
        warning: "Had trouble reaching the AI just now — saved your own words instead.",
      };
    }
  }

  const mood = detectFamilyFromText(userText);
  const fallback = fallbackCaptionFor(mood);
  return { text: userText, mood, caption: fallback.caption, captionAuthor: fallback.captionAuthor, source: "fallback" };
}

/**
 * Runs the "Minimal Zine Poster v0.1" skill via a Claude call — given a
 * Theme/Brief/Photo/Target-output request (plus the real photos, if any, as image
 * input so Claude can see and describe them itself), Claude compiles the final
 * four-paragraph Standard Mode prompt text, ready to hand straight to OpenAI.
 */
export async function compileZinePrompt(entry: ImageEntryInput): Promise<string> {
  const hasPhotos = entry.photos.length > 0;
  const photoLine = hasPhotos
    ? `attached (${entry.photos.length} photo${entry.photos.length === 1 ? "" : "s"}, included below) - this is (a) source material: look at ${
        entry.photos.length === 1 ? "it" : "them"
      } and extract/distill the image anchor directly FROM what is actually in the photo${
        entry.photos.length === 1 ? "" : "s"
      } (a real cropped or reinterpreted element from the actual photo content), never a different invented scene. This is not (b) mood/contrast reference - every attached photo must stay fully visible and recognizable in the final composition, none may be dropped, replaced, or reduced to background reference only.`
    : "none - invent one small non-photographic image anchor drawn from the Brief below.";
  const targetMode = hasPhotos ? "image-to-image using the attached photo(s) as source" : "pure text-to-image";
  const themeText = entry.captionAuthor ? `"${entry.caption}" — ${entry.captionAuthor}` : `"${entry.caption}"`;

  const requestText = `/anthropic-skills:gc-minimal-zine-poster-v0-1

Theme: ${themeText}

Brief: ${entry.text || "(no additional journal text)"}

Photo: ${photoLine}

Target output: optimize the final prompt for OpenAI, since I'll paste it into that model as ${targetMode}.`;

  const content: Record<string, unknown>[] = [{ type: "text", text: requestText }];
  if (hasPhotos) {
    entry.photos.forEach((dataUrl) => {
      const parts = dataUrlToParts(dataUrl);
      if (parts) content.push({ type: "image", source: { type: "base64", media_type: parts.mimeType, data: parts.base64 } });
    });
  }

  const text = await callAnthropic({
    model: env.anthropicModel,
    max_tokens: 700,
    system: ZINE_SKILL_SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });
  return text
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/```\s*$/, "")
    .trim();
}
