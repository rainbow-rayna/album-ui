import { env, hasAnthropic } from "../env";
import {
  OPENAI_EDITS_URL,
  OPENAI_GENERATIONS_URL,
  OPENAI_IMAGE_SIZE,
  ZINE_ACCENT_COLORS,
  ZINE_INVENTED_ANCHORS,
  ZINE_LAYOUTS,
  ZINE_MOOD_CANDIDATES,
  ZINE_TEXTURES,
  ZINE_TYPOGRAPHY_MODES,
} from "../prompts";
import { dataUrlToBlob } from "../lib/dataUrl";
import { compileZinePrompt } from "./anthropic";
import type { Family, ImageEntryInput } from "../../shared/ai";

/**
 * OpenAI image generation — the AI-rendered "minimal zine poster" page.
 *
 * Server-side only; the key stays in this process. The prompt is normally
 * compiled by Claude (running the zine skill properly), with the local compiler
 * below as a fallback for when Anthropic is unconfigured or unreachable — so an
 * OpenAI-only setup still produces a correctly-shaped poster prompt.
 */

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

type ZineRecipe = {
  layoutText: string;
  texture: string;
  typography: string;
  accent: string;
  invented: string;
};

let lastZineLayout: string | null = null;

function pickZineRecipe(): ZineRecipe {
  const layoutKeys = Object.keys(ZINE_LAYOUTS);
  const choices = lastZineLayout && layoutKeys.length > 1 ? layoutKeys.filter((k) => k !== lastZineLayout) : layoutKeys;
  const layoutKey = pick(choices);
  lastZineLayout = layoutKey;
  return {
    layoutText: ZINE_LAYOUTS[layoutKey],
    texture: pick(ZINE_TEXTURES),
    typography: pick(ZINE_TYPOGRAPHY_MODES),
    accent: pick(ZINE_ACCENT_COLORS),
    invented: pick(ZINE_INVENTED_ANCHORS),
  };
}

// Picks 2 distinct words each call so the Mood Mode axis actually varies run-to-run
// (per the skill's Variation Engine) while staying within what's thematically plausible
// for the detected family.
function pickZineMoodWords(family: Family): string {
  const candidates = ZINE_MOOD_CANDIDATES[family] || ZINE_MOOD_CANDIDATES.scatter;
  if (candidates.length <= 2) return candidates.join(", ");
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2).join(", ");
}

function buildZinePosterPrompt(entry: ImageEntryInput): string {
  const family = entry.family;
  const moodWords = pickZineMoodWords(family);
  const recipe = pickZineRecipe();
  const photoCount = entry.photos.length;
  const vibeSnippet = entry.text ? entry.text.slice(0, 500) : "";

  const canvasPara = `Tall vertical 3:5 phone-poster canvas, full-frame aged/scanned matte paper background, no border, no device mockup. 70%-90% of the page is bare paper with wide, deliberate negative space. The one visual cluster occupies roughly 8%-25% of the canvas as ${recipe.layoutText}, kept clear of the paper's outer edges (no edge-hugging).`;

  const anchorPara =
    photoCount > 0
      ? `The cluster is made of exactly ${photoCount} attached reference photograph${photoCount === 1 ? "" : "s"} - do not invent, omit, duplicate, or add any extra photographic imagery beyond ${photoCount === 1 ? "this one" : "these " + photoCount}. Arrange them as small overlapping snapshot-style prints with soft torn or deckled paper edges, sized to fit within the cluster area. Keep every photo recognizably itself (same people, same scene) - only its placement and paper-integration treatment may change, never its content. Apply only light ${recipe.texture} paper-integration wear (soft edge, faint print grain).`
      : `No photos were attached, so invent one small non-photographic image anchor - a ${recipe.invented} - that symbolically captures one specific concrete detail from the memory (not the whole scene), with light ${recipe.texture} paper-integration wear.`;

  const authorPart = entry.captionAuthor
    ? ` and, in smaller low-contrast ghost type beneath or beside it, the attribution "— ${entry.captionAuthor}"`
    : " with no attribution beneath it - it is not a quote from a known person";
  const colorSharePara =
    photoCount > 0
      ? `The reference photo(s) are this page's one high-chroma element - kept in full natural color, not desaturated - filling the entire small cluster rather than a fragment of it, since these are the real attached photos and all of them must stay fully visible.`
      : `The ${recipe.accent} ${recipe.invented} is this page's one high-chroma element: a fully saturated, opaque ${recipe.accent} ink/shape, occupying roughly 20%-30% of the small cluster (about 1%-2% of the full canvas). Everything else on the page - paper, type, secondary marks - stays muted paper/ink tones.`;
  const typographyPara = `Render this exact phrase, in full and verbatim - no truncation, no paraphrase, no summarizing - as small serif, typewriter, or monospaced print type: "${entry.caption}"${authorPart}. Typography behaves as ${recipe.typography}. This phrase (plus its attribution, if any) is the only text allowed anywhere on the page. ${colorSharePara}`;

  const moodPara = `Overall reproduction is a flat, orthographic scan of matte, absorbent paper: diffuse light, low-to-medium contrast, no hard shadow, no 3D depth. Emotional temperature: ${moodWords} - poetic, sparse, diary-like, archival, distant, memory-like, Japanese/Korean indie zine or minimal editorial mood.${
    vibeSnippet
      ? ` For inspiration only, do not render this text itself anywhere on the page - here is the journal entry to draw the underlying feeling and one specific detail from: "${vibeSnippet}"`
      : ""
  } Avoid: full-bleed scene, commercial headline hierarchy, product-ad/logo/CTA layout, glossy paper mockup, a photograph of the poster itself (table, wall or dark background around the paper, visible outer paper edge, binding, perspective angle), clean UI white background, cinematic lighting, 3D rendering, neon, cute cartoon, fashion editorial drama, dense scrapbook clutter, stickers, washi tape, more than one saturated hue, and long clean text blocks.`;

  return [canvasPara, anchorPara, typographyPara, moodPara].join(" ");
}

export async function generateZinePage(entry: ImageEntryInput): Promise<string> {
  let promptText: string;
  try {
    if (!hasAnthropic()) throw new Error("no Anthropic key configured");
    promptText = await compileZinePrompt(entry);
  } catch (err) {
    console.warn("[api] zine prompt compile via Claude failed, using local compiler:", err);
    promptText = buildZinePosterPrompt(entry);
  }

  const hasPhotos = entry.photos.length > 0;
  const authHeader = { Authorization: `Bearer ${env.openAiApiKey}` };

  let res: Response;
  if (hasPhotos) {
    const form = new FormData();
    form.append("model", env.openAiImageModel);
    form.append("prompt", promptText);
    form.append("size", OPENAI_IMAGE_SIZE);
    form.append("quality", "medium");
    form.append("background", "opaque");
    entry.photos.forEach((dataUrl, i) => {
      const blob = dataUrlToBlob(dataUrl);
      if (!blob) return;
      const ext = blob.type.split("/")[1] || "png";
      form.append("image[]", blob, `photo-${i}.${ext}`);
    });
    res = await fetch(OPENAI_EDITS_URL, { method: "POST", headers: authHeader, body: form });
  } else {
    res = await fetch(OPENAI_GENERATIONS_URL, {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeader },
      body: JSON.stringify({
        model: env.openAiImageModel,
        prompt: promptText,
        size: OPENAI_IMAGE_SIZE,
        quality: "medium",
        background: "opaque",
        n: 1,
      }),
    });
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error("OpenAI API error " + res.status + (errText ? ": " + errText.slice(0, 300) : ""));
  }
  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    console.warn("[api] OpenAI response contained no image");
    throw new Error("No image found in OpenAI response");
  }
  return `data:image/png;base64,${b64}`;
}
