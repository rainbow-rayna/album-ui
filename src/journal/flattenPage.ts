import { PAGE_WIDTH, PAGE_HEIGHT } from "../utils/pageBend";

/**
 * Makes an AI-rendered page image sit in the book as a page, not as a
 * photograph of one.
 *
 * Image models draw journal pages the way their training data shows them —
 * phone photos of real journals — so even when told to draw a flat page they
 * often frame it like one: a white margin or a tabletop along a side, or the
 * collage sheet sitting on a second, paler sheet with its own edge and shadow
 * showing. Mapped onto the 3D page, that frame reads as a snapshot stuck into
 * the album. This finds such a frame and trims it off, then fits what's left
 * to the book page's proportions.
 *
 * A band along an edge is only trimmed when it is unmistakably a different
 * surface: plain from end to end, different in colour from the page just
 * inside it along most of its length, and separated from it by one straight
 * edge running most of the way along that side. Collage artwork near an edge
 * (cards, tape, text) never passes all three, so a clean page comes through
 * untouched apart from the proportion fit.
 *
 * It runs when a page is displayed rather than when it's saved, so stored
 * originals are untouched and pages made before this existed are fixed too.
 */

const PAGE_ASPECT = PAGE_WIDTH / PAGE_HEIGHT;
const MAX_OUTPUT_WIDTH = 1024;

// Analysis runs on a small copy: fast, and the downscale averages away paper
// grain that would otherwise read as "texture" in the band tests below.
const ANALYSIS_WIDTH = 240;

const MAX_BAND = 0.2; // never cut more than this fraction of the image from one side
const BAND_LINE_TOLERANCE = 24; // every line of a band stays this close (RGB) to the band's colour...
// ...and is this plain along its length (luminance std). Blank margins and
// tabletops measure ~1-12; a strip of the page's own paper with even a few
// doodles or stamps in it measures 20+, which is what keeps a clean page's
// plain border from being mistaken for a frame.
const BAND_MAX_LINE_STD = 15;
const MIN_SURFACE_JUMP = 30; // median RGB distance, band vs. page just inside it
const EDGE_STEP = 14; // luminance step that counts as a crisp edge at one position
// Share of the side that edge must run along. Not higher: a sheet lit
// unevenly can fade to almost the margin's tone along part of its edge.
const MIN_EDGE_CONTINUITY = 0.6;
const EDGE_LINE_TOLERANCE = 18; // lines this far from the page colour are still sheet edge/shadow
const MAX_EDGE_LINE = 0.035; // how far past a band to keep eating edge/shadow lines

type RGB = [number, number, number];
type Side = "top" | "bottom" | "left" | "right";

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Pixels along one side, as lines counted from that side inward × positions along each line. */
interface Strip {
  lines: number;
  positions: number;
  rgb: Float32Array; // (line * positions + position) * 3
  lum: Float32Array; // line * positions + position
}

const luminance = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
const distance = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function median(values: Float32Array): number {
  const sorted = Float32Array.from(values).sort();
  return sorted[Math.floor(sorted.length / 2)];
}

/** Reads a side of `rect`; each line's two ends are skipped so a neighbouring side's margin can't skew it. */
function readStrip(img: ImageData, rect: Rect, side: Side): Strip {
  const { data, width } = img;
  const horizontal = side === "top" || side === "bottom";
  const lines = horizontal ? rect.y1 - rect.y0 : rect.x1 - rect.x0;
  const start = horizontal ? rect.x0 : rect.y0;
  const length = horizontal ? rect.x1 - rect.x0 : rect.y1 - rect.y0;
  const along: number[] = [];
  for (let t = start + Math.floor(length * 0.05); t < start + Math.ceil(length * 0.95); t += 2) along.push(t);

  const positions = along.length;
  const rgb = new Float32Array(lines * positions * 3);
  const lum = new Float32Array(lines * positions);
  for (let k = 0; k < lines; k++) {
    const line =
      side === "top" ? rect.y0 + k : side === "bottom" ? rect.y1 - 1 - k : side === "left" ? rect.x0 + k : rect.x1 - 1 - k;
    for (let j = 0; j < positions; j++) {
      const i = ((horizontal ? line : along[j]) * width + (horizontal ? along[j] : line)) * 4;
      const o = k * positions + j;
      rgb[o * 3] = data[i];
      rgb[o * 3 + 1] = data[i + 1];
      rgb[o * 3 + 2] = data[i + 2];
      lum[o] = luminance(data[i], data[i + 1], data[i + 2]);
    }
  }
  return { lines, positions, rgb, lum };
}

/**
 * How many lines to cut from one side: the depth of a plain band that is a
 * different surface from the page next to it, plus the edge/shadow line that
 * separates them. 0 when that side is page all the way out.
 */
function bandDepth(strip: Strip): number {
  const { lines: n, positions: m, rgb, lum } = strip;
  if (m === 0) return 0;
  const window = Math.max(3, Math.round(n * 0.025));
  const maxBand = Math.floor(n * MAX_BAND);

  const lineColor: RGB[] = [];
  const lineStd: number[] = [];
  for (let k = 0; k < n; k++) {
    let r = 0;
    let g = 0;
    let b = 0;
    let l = 0;
    let l2 = 0;
    for (let j = 0; j < m; j++) {
      const o = k * m + j;
      r += rgb[o * 3];
      g += rgb[o * 3 + 1];
      b += rgb[o * 3 + 2];
      l += lum[o];
      l2 += lum[o] * lum[o];
    }
    lineColor.push([r / m, g / m, b / m]);
    lineStd.push(Math.sqrt(Math.max(0, l2 / m - (l / m) ** 2)));
  }
  const colorAt = (k: number, j: number): RGB => {
    const o = (k * m + j) * 3;
    return [rgb[o], rgb[o + 1], rgb[o + 2]];
  };

  const bandSum = new Float32Array(m * 3);
  const jumps = new Float32Array(m);
  let best = 0;
  let bestJump = 0;
  for (let b = 1; b <= maxBand && b + 1 + window + 2 < n; b++) {
    for (let j = 0; j < m; j++) {
      const c = colorAt(b - 1, j);
      bandSum[j * 3] += c[0];
      bandSum[j * 3 + 1] += c[1];
      bandSum[j * 3 + 2] += c[2];
    }
    // Growing the band only ever adds lines, so once it stops being one
    // plain surface it never will be again.
    const bandLines = lineColor.slice(0, b);
    const bandColor: RGB = [0, 1, 2].map((ch) => bandLines.reduce((s, c) => s + c[ch], 0) / b) as RGB;
    if (lineStd[b - 1] >= BAND_MAX_LINE_STD || bandLines.some((c) => distance(c, bandColor) >= BAND_LINE_TOLERANCE)) break;
    if (b < 2) continue;

    // Different surface: compared position by position, so a few cards or a
    // line of text starting just inside a plain paper border can't carry it.
    for (let j = 0; j < m; j++) {
      const inside: RGB = [0, 0, 0];
      for (let k = b + 1; k < b + 1 + window; k++) {
        const c = colorAt(k, j);
        inside[0] += c[0] / window;
        inside[1] += c[1] / window;
        inside[2] += c[2] / window;
      }
      jumps[j] = distance([bandSum[j * 3] / b, bandSum[j * 3 + 1] / b, bandSum[j * 3 + 2] / b], inside);
    }
    const jump = median(jumps);
    if (jump < MIN_SURFACE_JUMP) continue;

    // One straight edge along most of the side (allowing a couple of lines of
    // slant), which a sheet edge makes and scattered artwork doesn't.
    let crisp = 0;
    for (let j = 0; j < m; j++) {
      let step = 0;
      for (let k = Math.max(1, b - 2); k <= Math.min(n - 2, b + 2); k++) {
        step = Math.max(step, Math.abs(lum[(k + 1) * m + j] - lum[(k - 1) * m + j]));
      }
      if (step > EDGE_STEP) crisp++;
    }
    if (crisp / m < MIN_EDGE_CONTINUITY) continue;

    if (jump > bestJump) {
      bestJump = jump;
      best = b;
    }
  }
  if (!best) return 0;

  // Step past the sheet's own edge and the shadow it casts: lines that still
  // don't match the page a little further in.
  const ref = lineColor.slice(best + window, best + 3 * window);
  const pageColor: RGB = [0, 1, 2].map((ch) => ref.reduce((s, c) => s + c[ch], 0) / Math.max(1, ref.length)) as RGB;
  const limit = Math.min(n - 1, best + Math.round(n * MAX_EDGE_LINE));
  let depth = best;
  while (depth < limit && distance(lineColor[depth], pageColor) > EDGE_LINE_TOLERANCE) depth++;
  return depth + 1; // one more line for the anti-aliased seam
}

/** Fraction of the image to cut from each side (0 where the page already runs to the edge). */
export function detectFrame(img: ImageData): Record<Side, number> {
  const { width: W, height: H } = img;
  const full: Rect = { x0: 0, y0: 0, x1: W, y1: H };

  // First pass on the whole image, second with the other axis's bands
  // excluded, so a left margin doesn't blur the top edge's test and vice versa.
  const first = {
    top: bandDepth(readStrip(img, full, "top")),
    bottom: bandDepth(readStrip(img, full, "bottom")),
    left: bandDepth(readStrip(img, full, "left")),
    right: bandDepth(readStrip(img, full, "right")),
  };
  const columns: Rect = { x0: first.left, y0: 0, x1: W - first.right, y1: H };
  const rows: Rect = { x0: 0, y0: first.top, x1: W, y1: H - first.bottom };
  const depth = {
    top: bandDepth(readStrip(img, columns, "top")),
    bottom: bandDepth(readStrip(img, columns, "bottom")),
    left: bandDepth(readStrip(img, rows, "left")),
    right: bandDepth(readStrip(img, rows, "right")),
  };

  // If the "frame" would leave less than 60% of either axis, this isn't a
  // page with a margin — it's something a trim can't make sense of.
  if (depth.left + depth.right > W * 0.4) depth.left = depth.right = 0;
  if (depth.top + depth.bottom > H * 0.4) depth.top = depth.bottom = 0;

  return { top: depth.top / H, bottom: depth.bottom / H, left: depth.left / W, right: depth.right / W };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** The page image with any photographic frame trimmed off, fitted to the book page, as a canvas. */
export async function flattenPageImage(src: string): Promise<HTMLCanvasElement> {
  const img = await loadImage(src);

  const probe = document.createElement("canvas");
  probe.width = ANALYSIS_WIDTH;
  probe.height = Math.max(1, Math.round((ANALYSIS_WIDTH * img.naturalHeight) / img.naturalWidth));
  const probeCtx = probe.getContext("2d", { willReadFrequently: true })!;
  probeCtx.imageSmoothingQuality = "high";
  probeCtx.drawImage(img, 0, 0, probe.width, probe.height);
  let trim: Record<Side, number> = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    trim = detectFrame(probeCtx.getImageData(0, 0, probe.width, probe.height));
  } catch (err) {
    // A heuristic misfire must never cost the page its picture: show it untrimmed.
    console.warn("Couldn't analyse page image for trimming; showing it untrimmed.", err);
  }

  const sx = trim.left * img.naturalWidth;
  const sy = trim.top * img.naturalHeight;
  const sw = (1 - trim.left - trim.right) * img.naturalWidth;
  const sh = (1 - trim.top - trim.bottom) * img.naturalHeight;

  const out = document.createElement("canvas");
  out.width = Math.round(Math.min(MAX_OUTPUT_WIDTH, sw));
  out.height = Math.round(out.width / PAGE_ASPECT);
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out;
}

const urlCache = new Map<string, Promise<string>>();

/**
 * Same as flattenPageImage, as a data URL for <img> previews and thumbnails.
 * Cached per source image; if anything goes wrong the original is used, so a
 * page is never lost to this step.
 */
export function flattenedPageUrl(src: string): Promise<string> {
  let url = urlCache.get(src);
  if (!url) {
    url = flattenPageImage(src)
      .then((canvas) => canvas.toDataURL("image/jpeg", 0.92))
      .catch((err) => {
        console.warn("Couldn't flatten page image, showing it as-is.", err);
        return src;
      });
    urlCache.set(src, url);
  }
  return url;
}
