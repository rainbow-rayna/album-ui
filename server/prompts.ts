import type { Family } from "../shared/ai";

/**
 * Every prompt, upstream URL, and fallback bank used to talk to a model.
 *
 * These moved out of `src/journal/constants.ts` when the provider calls moved
 * server-side: they are only meaningful next to an API key, and keeping them
 * here means the (substantial) prompt text is no longer shipped to every
 * browser that loads the album.
 */

export const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
export const OPENAI_GENERATIONS_URL = "https://api.openai.com/v1/images/generations";
export const OPENAI_EDITS_URL = "https://api.openai.com/v1/images/edits";
export const OPENAI_IMAGE_SIZE = "1024x1536";

export const CHAT_SYSTEM_PROMPT =
  "You are a warm, casual friend having a relaxed conversation with someone about a moment they want to remember - not an interviewer working through a checklist. Respond the way a real friend texting back would: most of the time, react to what they just said - relate to it, share a brief thought or feeling, agree, empathize, or just acknowledge it warmly - in 1-2 short sentences. Do NOT ask a question after every single message. Only ask a follow-up question when you're genuinely curious and it fits naturally, and even then keep it to well under half of your replies - across the conversation, reactions and comments should clearly outnumber questions. Never ask more than one question in a single reply. Keep the tone light, natural, and low-key, like a real back-and-forth text conversation, not a survey.";

export const SUMMARY_SYSTEM_PROMPT =
  "You turn a reflective conversation into scrapbook page material. First, write a short, warm, first-person journal entry as if the person wrote it themselves - a natural, flowing handful of sentences (however many feels right for what they actually shared, no need to hit an exact count). Plain prose only: no bullet points, no headers, and absolutely no title or heading line of any kind above or before the entry - it should just start directly with the first sentence of the reflection. Then, on a new line, output a tag in the form MOOD: X where X is the single best-fitting word from this list based on the feeling and content of the conversation: scatter (cozy, nostalgic, everyday warmth), grid (calm, orderly, reflective, low-key), filmstrip (travel, adventure, a sequence of moments or a story), circles (playful, joyful, fun, celebratory). Then, on another new line, output a tag in the form CAPTION: Y. This is the one piece of AI reflection the person actually sees on the page, so it needs to earn its place: sit with what they shared - the feeling underneath it, not just the events - and surface a short, genuinely thoughtful, insightful, philosophical quote, saying, or proverb that resonates with that feeling. Two options: (1) a real quote you know, spoken or written by an actual identifiable person - only use this if you are confident the quote and its attribution are accurate, never fabricate a quote or misattribute one; or (2) Try to identify a somewhat niche principle or idea from any intellectual discipline - this should be a principle or idea that an early undergraduate wouldn't have heard of but a graduate student would have; it should be relatively obscure but interesting and useful to know about nonetheless. Then render that principle as a short original saying, aphorism, or proverb-style line you compose yourself in that same wisdom-literature register, when no real quote fits well or you aren't certain of one. Keep Y itself short enough to sit comfortably on a small physical page - a single line, or at most two. Do not just restate or echo their own wording back at them - this should feel like a small piece of outside wisdom offered in response to what they shared, not a summary of it. Output ONLY the quote/saying text itself for Y, no attribution, no quotation marks, no label. Then, on a final line, output a tag in the form AUTHOR: Z - if Y is a real quote, Z is that person's name (and nothing else); if Y is a saying/proverb you composed yourself, output AUTHOR: none. Output nothing after the AUTHOR line.";

export const FALLBACK_QUESTIONS = [
  "What's the story behind this?",
  'How were you feeling in this moment?',
  'What made it stand out to you?',
  'Who were you with, if anyone?',
  "What's one word you'd use to describe it?",
  "Anything else you'd like to remember about this?",
];

export interface FallbackCaption {
  text: string;
  author?: string;
}

export const FALLBACK_CAPTIONS: Record<Family, FallbackCaption[]> = {
  scatter: [
    { text: 'The little things? The little things are the big things.', author: 'Jon Kabat-Zinn' },
    { text: 'Ordinary days, kept gently, become the life you remember.' },
    { text: 'Home is not a place - it is a feeling, stitched from small moments.' },
  ],
  grid: [
    { text: 'Stillness is where clarity begins.' },
    { text: "Almost everything will work again if you unplug it for a few minutes, including you.", author: 'Anne Lamott' },
    { text: 'In the quiet, the mind finally hears itself.' },
  ],
  filmstrip: [
    { text: 'Not all those who wander are lost.', author: 'J.R.R. Tolkien' },
    { text: 'The journey itself is my home.', author: 'Matsuo Bashō' },
    { text: 'Every mile away is a mile closer to who you are becoming.' },
  ],
  circles: [
    { text: 'Joy is not in things; it is in us.', author: 'Richard Wagner' },
    { text: 'Laughter is the sound of the soul remembering it is free.' },
    { text: 'Celebrate the moment - it will not come twice.' },
  ],
};

// Used by the Gemini collage-page prompt (ai.ts buildGeminiPrompt).
export const MOOD_STYLE_HINTS: Record<Family, string> = {
  scatter: 'loosely scattered photo placement at gentle angles, cozy and homey, overlapping edges',
  grid: 'neat, orderly grid-like arrangement, calm and quiet, minimal clutter',
  filmstrip: 'a horizontal sequence of photos like a filmstrip or travel log, sense of movement and journey',
  circles: 'playful circular photo cutouts, bright and celebratory, bouncy layout',
};

// Candidate words for the "Minimal Zine Poster v0.1" skill's Mood Mode variation axis
// (quiet, summer, solitude, childhood, seaside, afternoon, night, memory, slight surrealism),
// narrowed to what's thematically plausible per detected family. ai.ts picks 2 at random
// per generation from the matching list, so mood still varies run-to-run per the skill's
// Variation Engine while staying tied to the actual feeling of the entry.
export const ZINE_MOOD_CANDIDATES: Record<Family, string[]> = {
  scatter: ['quiet', 'memory', 'childhood', 'afternoon'],
  grid: ['quiet', 'solitude', 'afternoon', 'night'],
  filmstrip: ['seaside', 'summer', 'memory', 'night'],
  circles: ['summer', 'childhood', 'slight surrealism', 'seaside'],
};

// System prompt for the Claude "compile" step that runs the actual Minimal Zine Poster v0.1
// skill (see ai.ts compileZinePromptViaClaude) to turn a Theme/Brief/Photo/Target-output
// request into one final OpenAI-ready image-generation prompt. This is a faithful, compact
// distillation of that skill's Standard Mode Prompt Compiler - kept here rather than only in
// ai.ts because it's prompt content, like the other *_SYSTEM_PROMPT constants above.
export const ZINE_SKILL_SYSTEM_PROMPT =
  'You are compiling an image-generation prompt using the "Minimal Zine Poster v0.1" skill\'s Standard Mode Prompt Compiler. You will be given a Theme, a Brief, a Photo note, and a Target output note. Compile them into ONE final image-generation prompt for the target model named in "Target output" - nothing else. Output ONLY the raw prompt text: no markdown, no headings, no code fences, no explanation, no "Here is the prompt:" preamble.\n\n' +
  'Visual identity: poetic minimal paper poster, huge negative space, old/scanned paper, one tiny anchor, sparse type, one clear high-chroma color anchor, zine/editorial mood. Never a full-bleed scene, commercial ad layout, glossy mockup, 3D/cinematic/neon render, cute cartoon, or dense clutter.\n\n' +
  'Compile the prompt by answering these questions, in this order, inside four compact paragraphs:\n' +
  "1. Canvas + Attention Geometry: tall vertical 3:5 phone-poster, full-frame aged/scanned paper, no border, no mockup. 70%-90% bare paper; the one visual cluster occupies roughly 8%-25% of the canvas, placed center / upper-middle / lower-middle / lower-left / upper-right, never touching the outer edge.\n" +
  '2. Image Anchor + Anchor Treatment: the one imageable subject (an object, fragment, photo crop, specimen, cutout, silhouette, old illustration, texture window) and the material process that makes it belong to paper (low contrast, photocopy softness, torn/softened edge, halftone, scanline, risograph grain, xerox wear, ink bleed, misregistration). Never desaturate the chosen color anchor itself. If real reference photos are attached, they ARE the anchor - keep every one of them fully visible and recognizable, never invent, omit, duplicate, or replace them with a different scene.\n' +
  '3. Typography + Color Logic + print defects: small serif, typewriter, or monospaced type only (never handwriting or script), the exact phrase given to you as the Theme text and nothing else, semi-legible microtext or fragmented letters allowed around it, text may drift, press against the anchor, blur, or misregister, but must stay clear of the outer edge. State the exact high-chroma hue, its material form (e.g. "fully saturated cobalt-blue risograph ink", "opaque ultramarine cutout"), and its approximate visual share - about 0.8%-2.5% of the whole canvas, or 15%-35% of the small cluster, EXCEPT when real attached photos are the anchor, in which case they may fill the entire cluster since all of them must stay fully visible. Never use "pale", "muted", "faded", "pastel", or "near-monochrome" wording for the accent. Use only one main high-chroma hue.\n' +
  '4. Reproduction Texture + Emotional Temperature + Hard Avoids: flat orthographic scanned-paper look, matte absorbent paper, diffuse light, low-to-medium contrast, no hard shadow, no 3D depth. Emotional temperature: quiet, poetic, nostalgic, sparse, diary-like, archival, memory-like, Japanese/Korean indie zine or minimal editorial mood - grounded in the specific feeling of the Brief text, not generic. End with an explicit avoid-list: full-bleed scene, commercial headline, product ad, logo/CTA, glossy mockup, a photograph of the poster/page/book itself (table, wall or dark background around the paper, visible outer paper edge, binding, perspective angle), clean UI white, cinematic lighting, 3D, neon, cute cartoon, fashion editorial drama, dense scrapbook clutter, stickers, washi tape, more than one saturated hue, long clean text blocks.\n\n' +
  'Before compiling, silently pick one option for layout, image-anchor type (only when inventing one - never when real photos are attached), typography behavior, texture, and mood so the visual grammar has real variety each time - do not default to "tiny photo + blue dots + microtext" every time.\n\n' +
  "The Theme text given to you must appear in the final compiled prompt exactly, in full, verbatim - never truncated, paraphrased, shortened, or summarized - as the in-image typography, along with its attribution if one is given, since it is the user's own chosen reflection line, not a placeholder to improve on.";

export const MOOD_KEYWORDS: Record<'filmstrip' | 'circles' | 'grid', string[]> = {
  filmstrip: [
    'trip', 'travel', 'hike', 'hiking', 'adventure', 'explore', 'vacation', 'journey',
    'flight', 'mountain', 'beach', 'city', 'drove', 'walked', 'airport', 'train', 'abroad',
  ],
  circles: [
    'fun', 'laugh', 'haha', 'lol', 'silly', 'party', 'celebrat', 'excited', 'yay',
    'friends', 'game', 'dance', 'joy', 'happy',
  ],
  grid: [
    'calm', 'peaceful', 'quiet', 'tired', 'rest', 'reflect', 'work', 'focus', 'alone',
    'rain', 'cozy', 'tea', 'coffee', 'book', 'sad', 'worry', 'stress', 'overwhelm', 'busy',
  ],
};

// Variation-engine option lists for the "Minimal Zine Poster v0.1" skill (ai.ts buildZinePosterPrompt).
// 'type-led' is intentionally omitted from ZINE_LAYOUTS: this app always needs a real or invented
// image anchor on the page, and type-led calls for the image to be secondary or absent.
export const ZINE_LAYOUTS: Record<string, string> = {
  'center-fragment': 'a tiny central cluster with wide open air on every side',
  'lower-left-float': 'a small cluster floating in the lower-left quadrant, with a large empty upper-right area',
  'upper-right-block': 'a small cluster in the upper-right corner, with the rest of the page bare paper',
  'dual-panel': 'two small overlapping or adjacent panels with a narrow gap between them, the rest of the page bare paper',
  'irregular-cutout': 'a torn or organically-shaped paper fragment carrying the cluster, floating on bare paper',
  'dot-orbit': 'a small cluster with a loose orbit of hand-drawn dots and hairline marks around it',
  'single-specimen': 'one isolated small cluster presented like a pressed specimen, almost no supporting marks',
};

// Anchor-treatment wear only (applied to the photo/invented-object cluster) - matches the
// skill's Anchor Treatment list (low contrast, photocopy softness, torn edge, softened edge,
// halftone, scanline, risograph grain, xerox wear, ink bleed, slight misregistration).
export const ZINE_TEXTURES = [
  'xerox softness',
  'risograph grain',
  'letterpress ink bleed',
  'halftone degradation',
  'film grain',
  'scan noise and paper fibers',
  'aged paper mottling',
];

// 'almost textless, only a tiny caption' and 'text inside a color block or cutout' are
// intentionally omitted: this app always renders the full caption text verbatim, so a
// near-textless mode would contradict that, and the color-block variant is close enough
// to 'text inside a torn paper strip' below to skip as a near-duplicate. 'Soft motion blur'
// lives here (not in ZINE_TEXTURES above) because the skill's Typography System - not its
// Anchor Treatment rules - is what permits text to 'drift... blur, or misregister'.
export const ZINE_TYPOGRAPHY_MODES = [
  'fragmented floating letters',
  'a short phrase pressed against the image edge',
  'archive microtext with a tiny date',
  'diagonal scattered words',
  'softly motion-blurred, as if slightly out of focus',
  'low-contrast gray ghost text beneath the phrase',
  'text inside a torn paper strip',
  'headline-as-object with rough letterpress',
];

export const ZINE_ACCENT_COLORS = [
  'cobalt blue',
  'ultramarine',
  'cyan',
  'violet',
  'magenta-pink',
  'lemon yellow',
  'pear green',
  'orange',
  'tomato red',
];

export const ZINE_INVENTED_ANCHORS = [
  'torn-paper clipping',
  'flat silhouette',
  'solid color block',
  'old printed illustration',
  'object specimen',
  'translucent geometric overlay',
  'abstract texture window',
];

// Used by the Gemini collage-page prompt (ai.ts buildGeminiPrompt).
//
// The framing rule leads, before any aesthetic: the generated image is
// pasted straight onto a page of the 3D book, so it has to *be* the page. Left
// to "a page from someone's real journal" (and, previously, "natural light"),
// models regularly drew a photograph of a journal instead - the collage sheet
// on a paler page with margins, or a notebook on a table - which then looked
// like a snapshot stuck into the album rather than a page of it. This makes
// that much rarer but can't rule it out, so the browser also trims off any
// such frame before display (src/journal/flattenPage.ts).
export const STYLE_PROMPT_BASE =
  'Render the page itself, not a photograph of it: the image IS one flat scrapbook page seen perfectly straight-on, like a high-resolution flatbed scan, and its paper surface fills the entire frame, running off all four edges. There is no book, notebook, spiral binding, rings, spine or gutter; no table, desk, wall or dark background around the page; no visible outer page edge, border, margin or second sheet behind it; no hands, camera angle, perspective, page curl, vignette, glare, or shadow cast by the page. Lighting is even and shadowless across the whole sheet; things collaged onto the page (photos, tape, paper scraps) may cast only a faint, tight contact shadow onto the paper. ' +
  'Aesthetic: handmade scrapbook / art journal page, mixed-media collage. Warm cream or kraft-paper background with visible paper grain and slight texture. Reference photos placed at slight rotations (3-10 degrees), some with white polaroid-style borders, some with torn/deckled edges, layered so corners overlap. Strips of washi tape (pastel or muted patterned) taped over some photo corners. Small doodles - stars, hearts, arrows, squiggly underlines - sketched in pen alongside the text. A few hand-drawn/illustrated paper-ephemera accents (not photographic): sketched ticket-stub shapes, ink stamp marks, drawn flower or leaf motifs, stitched or dashed-line borders. Soft, warm, slightly desaturated color palette, no harsh digital gradients. Overall feel: cozy, personal, tactile - like a page from someone\'s real journal, not a template. Portrait orientation, roughly a 3:4 page.';
