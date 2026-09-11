# AI Scrapbook — Build Blueprint

> This file is the source text for a layered architecture illustration.
> Paste the whole thing into Codex / Gemini / Claude and have it render the
> diagram following the *Drawing Spec* at the bottom.
>
> Copy the card text verbatim. Do not rewrite the monospace identifiers —
> they are real file names and real routes.

**Subtitle** (small grey text under the main title): `(a screenshot to hand to Claude Code)`

**Top pill** (centered, warm gold outline):
`3D scrapbook album · AI Scrapbook · talk out a memory → write it up with a fitting adage → render it as a page → bind it into a book you can flip`

---

## Layer 1 · External Context

> Left gutter label: `LAYER 1` / `External context`
> Grid: 2 × 2, four cards

### Card 1
- eyebrow: `USER/`
- title: **Your own material**
- description: the few things that make this album yours — none of it leaves this machine
- chips: `photos[]` `chat[]` `text` `caption`

### Card 2
- eyebrow: `BRAIN`
- title: **Claude · Anthropic**
- description: one model, three jobs — hold the conversation → write the entry and pick the adage → compile the image prompt
- chips: `/v1/messages` `haiku-4.5` `vision`

### Card 3
- eyebrow: `IMAGE`
- title: **Gemini · OpenAI**
- description: two page looks — collage poster vs. minimal zine — the server alternates between them at random
- chips: `flash-image` `gpt-image-1` `3:4` `1024x1536`

### Card 4
- eyebrow: `SECRETS · I/O`
- title: **.env · localStorage · canvas**
- description: keys live only in the server process; the browser learns *whether*, never *what*. Zero binary assets.
- chips: `.env` `scrapbook_entries_v2` `canvas 2D`

---

## Layer 2 · Local Brain

> Left gutter label: `LAYER 2` / `Local brain`
> Grid: 2 rows × 3 columns, six cards

| # | eyebrow | title | description | chips |
|---|---|---|---|---|
| 1 | `ROUTES/AI.TS` | **Intent routing** | Four routes · providers shuffled per call · one dies, try the other · all dead, let the client draw it | `/status` `/chat` `/summary` `/image` |
| 2 | `PROMPTS.TS` | **Prompt library** | Three system prompts + a mood keyword table + a hand-written fallback bank | `CHAT` `SUMMARY` `ZINE_SKILL` `fallback` |
| 3 | `SERVICES/*` | **Provider adapters** | Every layer has a way out: Claude falls back to scripts, the two image models fall back to each other | `anthropic.ts` `gemini.ts` `openai.ts` |
| 4 | `LAYOUT.TS` | **Layout generator** | Produces a page with no AI at all · the mood family decides how photos sit | `scatter` `grid` `filmstrip` `circles` |
| 5 | `USEJOURNALSTORE` | **State · memory** | Entries sorted by date · written to localStorage · two faces packed onto one leaf | `entries[]` `persist` `getLeafFaces` |
| 6 | `PAGETEXTURE.TS` | **Page baking** | entry → canvas 2D → texture · one image face, one text face | `canvas 760px` `CanvasTexture` `cache key` |

---

## Layer 3 · Runtime Assembly

> Left gutter label: `LAYER 3` / `Runtime assembly`
> Layout: one full-width panel — a grid of six fragments plus two horizontal bars

**Panel header**: `JOURNAL ENTRY` **assembly box · every "Generate page" glues these 6 fragments into one entry**

The six fragments (3 columns × 2 rows, each with a colored numeral):

| № | name | monospace subtitle |
|---|---|---|
| ① | Full conversation | `chat[] · user + assistant` |
| ② | Your photos | `photos[] · data:image/*;base64` |
| ③ | The entry Claude wrote | `text · SUMMARY_SYSTEM_PROMPT` |
| ④ | Adage + attribution | `caption · captionAuthor` |
| ⑤ | Mood family | `mood · MOOD: tag / keyword scoring` |
| ⑥ | Layout seed | `layoutSpec · generateLayout()` |

**Bar A — `MODEL · forward pass`** (bottom of the panel, one shade darker)
```
compose(①…⑥) → image prompt
→ Gemini collages directly · OpenAI gets a zine prompt compiled by Claude first
→ data:image/png;base64 → entry.aiImage → localStorage → baked into a front and a back texture
```

**Bar B — `FALLBACK · three tiers`** (directly beneath Bar A, amber left border)
```
AI-rendered page  →  local canvas page  →  scripted questions + hand-written adage bank
Every tier is guaranteed to produce a page · no path ever leaves the user empty-handed
```

---

## Layer 4 · Interaction Surface

> Left gutter label: `LAYER 4` / `Interaction surface`
> Grid: 2 × 2, four cards

### Card 1
- eyebrow: `BOOK · 3D` · `LOCALHOST:5180`
- title: **The book you flip**
- description: R3F canvas · skinned paper on a bone chain · one warm lamp and a vignette · dragging orbits the camera, never the book
- chips: `three.js` `bone-chain` `bloom` `vignette`

### Card 2
- eyebrow: `PAGEPOOL`
- title: **14 meshes play a whole book**
- description: a read pile and an unread pile · exactly one leaf ever hangs between them · slide out of the window and a mesh is recycled with new content
- chips: `POOL_SIZE 14` `readProgress` `recycleStep`

### Card 3
- eyebrow: `COMPOSER`
- title: **A two-step overlay**
- description: upload → chat → generate the entry → preview → Save to book flips straight to the new page
- chips: `step 1 entry` `step 2 preview` `shuffle`

### Card 4
- eyebrow: `HTTP CONTRACT`
- title: **5 lines between browser and server**
- description (monospace, two columns):
```
GET  /api/health          POST /api/ai/chat
GET  /api/ai/status       POST /api/ai/summary
                          POST /api/ai/image
```
- chips: `vite proxy :5180 → :5185` `same origin, no CORS`

---

## The Return Loop (dashed arrow)

From `Save to book` at the right edge of **Layer 4**, draw an **amber dashed line**
up the right-hand margin, back into the `SECRETS · I/O` card in **Layer 1**.

Label on the line (small text): `entry → localStorage → loadEntries() rebuilds the whole book next time`

What it means: there is no server-side database. The book's thickness *is* the
accumulated history sitting in the browser.

---

## Drawing Spec

**Canvas**: portrait, roughly 1100px wide. Four layers stacked top to bottom, with a centered `↓` arrow between each pair.

**Palette** (dark blueprint, matching the app's own night scene):

| Role | Hex |
|---|---|
| Page background | `#08090b` |
| Card fill | `#11151b` |
| Card border | `#1e2731` |
| Title text | `#e8eef4` |
| Description text | `#8b98a5` |
| Chip fill / text | `#171d25` / `#7fa8c0` |
| Eyebrow cyan (layers 1 and 4) | `#5eb0c8` |
| Eyebrow amber (layer 2, cards 2 and 6) | `#c98a4a` |
| Eyebrow violet (layer 2, cards 3 and 5) | `#9b7fc4` |
| Top pill border / text | `#6b5a3a` / `#d9c08a` |
| Dashed return loop | `#8a6a3f` |

**Type**: sans-serif for titles and descriptions (Inter or similar).
Every eyebrow, chip, and code line in monospace (JetBrains Mono / SF Mono),
eyebrows in all caps with roughly 0.08em letter-spacing.

**Cards**: 10px radius, 18px padding, 1px border, no shadow.
Stack eyebrow → title → description → chips top to bottom with generous leading.

**Layer labels**: in the left margin outside the grid, two lines — `LAYER N` in white on top, the layer name in smaller grey beneath.

**Layer 3 panel**: full width, one shade darker than the ordinary cards, visibly heavier than the other three layers — it is the center of gravity of the whole diagram.

**Do not alter**: the monospace identifiers inside cards are real file names and routes, exactly as they appear. Descriptions may wrap across lines but should not be reworded.
