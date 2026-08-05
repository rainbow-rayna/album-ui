# memories — 3D interactive album

A React Three Fiber / Three.js scene: a kraft-paper scrapbook that stands
upright in open darkness, with pages that fan out from the spine like a
carousel and flip with a bone-skinned curl. Technical approach (bone-chain
page bending, GSAP-driven flip easing) follows the pattern from Wawa
Sensei's ["3D Book Slider Landing Page"](https://wawasensei.dev/tuto/3d-book-slider-landing-page-threejs-and-react)
tutorial, reworked for an upright/fanned layout instead of a flat lying book.

## Running it

This machine didn't have Node.js/npm installed, so the project was written
but never `npm install`-ed or opened in a browser. To run it:

```bash
cd "Album UI"
npm install
npm run dev
```

Then open the printed `localhost` URL. `npm run build` type-checks and
produces a production bundle.

Because I couldn't run a dev server here, the visual tuning below (fan
angles, curl strength, light intensities, texture tiling) is a first-pass
best guess from reading the code, not a verified-in-browser result. Expect
to nudge constants once you see it rendered — the values likely to need
adjustment are called out inline in the files themselves.

## Component tree

```
App
└─ Canvas (near-black bg, fog, PerspectiveCamera slightly above/looking down)
   └─ Experience        — lights, bloom + vignette post-processing, particles
      └─ Book            — orientation (upright, slight backward tilt), input, idle sway
         ├─ Cover(back)  — fixed "back wall" the open fan rests against
         ├─ PagePool     — circular buffer of pages (see below)
         └─ Cover(front) — kraft cover w/ all appliqués, opens/closes with page 0
```

- `src/utils/pageBend.ts` — the bone-chain geometry/skinning + curl math
  (page width, bone count, inside/outside/fold curve strengths, fan angle).
- `src/store/useBookStore.ts` — `currentPage` is an **unbounded** integer
  (0 = closed cover, 1..∞ = pages turned). `POOL_SIZE` is the only place the
  mesh count is capped.
- `src/components/PagePool.tsx` — the "infinite pages" implementation: a
  fixed pool of `POOL_SIZE` (14) `<Page>` meshes. Each holds a `logicalIndex`;
  as `currentPage` changes, the mesh falling out of the sliding window on one
  side is reassigned ("recycled") to the logical page entering the window on
  the other side, snapped instantly to its resting position at the far edge
  of the fan (nearly edge-on to the camera, so the reassignment reads as
  seamless). No new meshes are ever created after mount, and there is no
  hard-coded page count — you can flip forward indefinitely.
- `src/components/Page.tsx` — data-driven `content` prop (currently always
  `{ kind: "blank" }`). Swapping in photos later means adding new `kind`
  variants and drawing them onto the page material — the geometry, skinning,
  and flip logic don't need to change.
- `src/components/Cover.tsx` + `src/components/appliques/*` — the kraft
  cover and every glued-on element (ribbon bow, ribbon strand, spiral
  binding, hearts, stars, buttons, title tiles, advisory sticker) as
  separate small components.

## Assets that are procedural placeholders right now

Everything renders today with **zero binary assets** — all textures are
generated on `<canvas>` at runtime in `src/utils/textures.ts`. That keeps the
project runnable with no image pipeline, but none of it will match the
reference photo exactly. To get an exact match, supply or AI-generate these
and wire them into the listed spots:

| Asset | Currently | Replace in | Notes |
|---|---|---|---|
| Kraft paper texture (color + normal + roughness) | Procedural noise/fiber canvas | `getKraftPaperTextures()` in `textures.ts` | Want a real photographed/scanned kraft cardstock texture, tileable, with genuine fiber normal detail. |
| Page paper texture | Procedural cream noise canvas | `getPagePaperTextures()` in `textures.ts` | A real scrapbook-paper scan (ivory/cream, subtle grain) would read as far more tactile than the synthetic noise. |
| Gold spiral-binding texture | Flat gradient canvas | `getGoldCoilTextures()` in `textures.ts` | Should be a real brushed/polished gold metal texture (color + roughness, maybe metalness map) for a convincing metallic coil. |
| Black satin ribbon material | Flat gradient + streak canvas | `getSatinRibbonTextures()` in `textures.ts` | A real satin fabric scan (sheen normal map in particular) would sell the "ribbon" look much better than the procedural streaks. |
| "memories" ransom-note letters | `<canvas>`-drawn text per letter | `makeLetterTileTexture()` in `textures.ts` | Reference shows genuine cut-out magazine/print letters glued on paper tiles — real letter photographs (or a proper collage generator) would look much more authentic than rendered system fonts. |
| Heart / star / button appliqués | Procedural extruded shapes + solid colors | `appliques/Heart.tsx`, `Star.tsx`, `Button.tsx` | Real photographed felt-heart, star, and stitched-button sprites (as alpha-mapped planes or normal-mapped decals) would read as far more "physically glued on" than the current flat-shaded geometry. |
| Advisory sticker | Generic canvas-drawn label (**not** the official RIAA mark — deliberately not reproduced) | `getAdvisoryStickerTexture()` in `textures.ts` | If you want the exact official logo, that's a trademarked asset you'd need to source/license yourself; the current one is a stylized look-alike only. |

## Known rough edges / things to tune once you can see it

- Fan angles, stack depth, and curl strengths (`MAX_FAN`, `STACK_GAP`,
  `INSIDE_CURVE_STRENGTH`, `OUTSIDE_CURVE_STRENGTH`, `FOLD_CURVE_STRENGTH` in
  `pageBend.ts`) are first-pass numbers — adjust to taste.
- Appliqué positions on the cover (`Cover.tsx`) are placed by eyeballing
  fractions of cover width/height; nudge per-element once rendered.
- Light intensities/positions in `Experience.tsx` aim for "single warm lamp
  in a dark room" but weren't calibrated against a real render.
- The deckle/torn page edge is a single thin strip on the outer edge only
  (not all four borders), per the "keep it subtle" note in the brief.
