import { env } from "../env";
import { GEMINI_URL, MOOD_STYLE_HINTS, STYLE_PROMPT_BASE } from "../prompts";
import { dataUrlToParts, findInlineImage } from "../lib/dataUrl";
import type { ImageEntryInput } from "../../shared/ai";

/**
 * Gemini image generation — the AI-rendered scrapbook-collage page.
 *
 * Server-side only: the key stays in this process and the browser never sees
 * generativelanguage.googleapis.com. Unlike the chat routes there is no local
 * fallback here — if generation fails the caller (routes/ai.ts) either tries the
 * other provider or lets the client fall back to its own CSS layout, which it
 * can render without any AI at all.
 */

function buildGeminiPrompt(entry: ImageEntryInput): string {
  const moodHint = MOOD_STYLE_HINTS[entry.family] || "";
  const captionPart = entry.caption
    ? `Somewhere on the page, hand-render this exact quote/saying as if handwritten in pen or cut from paper letters, like a small piece of found wisdom tucked into the page: "${entry.caption}"${
        entry.captionAuthor
          ? ` - and in smaller writing beneath or beside it, attribute it with a dash and the name: "— ${entry.captionAuthor}"`
          : " (do not add any attribution or name beneath it - it is not a quote from a known person)"
      } Do not add any other text beyond this quote and its attribution (if given).`
    : "Include a small handwritten-style word or two that fits the mood, if there is natural space for it.";

  const photoCount = entry.photos.length;
  let photoPart: string;
  if (photoCount > 0) {
    photoPart = `You have been given exactly ${photoCount} reference photo${photoCount === 1 ? "" : "s"} as input images. Create a single, editorial-style collage poster using the provided photos.
Art direction:
- Extract the dominant or most evocative background color directly from the source photos and use it as the poster's base color.
- Aim for a polished, Instagram-inspired editorial aesthetic with an artistic vintage/retro feel.
- Use layered collage composition, paper-cut textures, subtle film grain, aged print imperfections, and restrained retro color accents.
- Add optional Instagram-style handwritten typography: expressive, casual, elegant, and integrated naturally into the layout. Keep any text minimal and decorative unless specific copy is provided.
- Transform any people in the photos into semi-abstract artistic illustrations or apply a tactile grainy halftone treatment. Preserve recognizable facial features and overall identity while making the result stylized and editorial.
- Maintain a balanced, premium composition with intentional negative space and clear visual hierarchy.
Hard constraints:
- Use every supplied photo/material exactly once - do not duplicate, mirror, repeat, or reuse any image element.
- Do not introduce additional people, photos, or unrelated objects.
- Ensure the final poster feels cohesive, artistic, and print-ready rather than like a simple photo grid.
- The output is the flat artwork itself, full-bleed - never a photograph or mockup of a printed poster, page or book (no wall, table, frame, binding, page edge, perspective or shadow around it).`;
  } else {
    const vibeContext = entry.text
      ? ` For inspiration only - do not render this journal text itself as writing anywhere on the page (the CAPTION text specified below is the only text allowed on the page) - here is the journal entry to draw the vibe, mood, and specific content from: "${entry.text}"`
      : "";
    photoPart = `No photos were uploaded for this page. Instead, creatively generate small illustrated/artistic visual artifacts that capture the specific vibe and content of this memory - for example a painted or sketched vignette, an illustrated motif or icon, a small watercolor scene, or symbolic imagery tied to what actually happened. Make it feel personal and specific to this particular entry, not generic clip-art doodles. These artifacts should read as hand-illustrated/artistic, never as a fake photorealistic photo.${vibeContext}`;
  }

  return [
    STYLE_PROMPT_BASE,
    moodHint ? `Layout mood: ${moodHint}.` : "",
    photoPart,
    captionPart,
    "Output a single image that is the finished page and nothing else: its paper runs to all four edges of the image, with no frame, border or surroundings, no UI, and no watermark text.",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateCollagePage(entry: ImageEntryInput): Promise<string> {
  const promptText = buildGeminiPrompt(entry);
  const input: Record<string, unknown>[] = [{ type: "text", text: promptText }];
  entry.photos.forEach((dataUrl) => {
    const parts = dataUrlToParts(dataUrl);
    if (parts) input.push({ type: "image", mime_type: parts.mimeType, data: parts.base64 });
  });

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": env.geminiApiKey,
    },
    body: JSON.stringify({
      model: env.geminiModel,
      input,
      response_format: { type: "image", aspect_ratio: "3:4" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error("Gemini API error " + res.status + (errText ? ": " + errText.slice(0, 300) : ""));
  }

  const data = (await res.json()) as Record<string, any>;
  // Try the documented convenience shape first, then fall back to a generic search
  // of the response, since the raw REST response shape isn't fully spelled out in the docs.
  let found: { mimeType: string; base64: string } | null = null;
  if (data.output_image && data.output_image.data) {
    found = {
      mimeType: data.output_image.mime_type || data.output_image.mimeType || "image/png",
      base64: data.output_image.data,
    };
  } else {
    found = findInlineImage(data, 0);
  }
  if (!found) {
    console.warn("[api] Gemini response contained no image");
    throw new Error("No image found in Gemini response");
  }
  return `data:${found.mimeType};base64,${found.base64}`;
}
