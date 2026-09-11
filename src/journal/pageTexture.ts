import * as THREE from "three";
import type { JournalEntry } from "./types";
import { PAGE_WIDTH, PAGE_HEIGHT } from "../utils/pageBend";
import { flattenPageImage } from "./flattenPage";

/**
 * Each journal entry occupies two adjacent leaves so they read together as
 * a spread, the way the composer's own preview shows them: an image leaf
 * (the AI collage, or a local canvas fallback of photos + caption when
 * there's no AI-rendered image) followed by a text leaf (date + the full
 * journal text, always rendered locally regardless of the image source).
 */
async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number): number {
  const words = text.split(/\s+/);
  let line = "";
  let lines = 0;
  for (let i = 0; i < words.length && lines < maxLines; i++) {
    const test = line ? line + " " + words[i] : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = words[i];
      y += lineHeight;
      lines++;
    } else {
      line = test;
    }
  }
  if (line && lines < maxLines) ctx.fillText(lines === maxLines - 1 ? line.slice(0, 60) : line, x, y);
  return y + lineHeight;
}

function makePageCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; W: number; H: number } {
  const W = 760;
  const H = Math.round((W * PAGE_HEIGHT) / PAGE_WIDTH);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  return { canvas, ctx: canvas.getContext("2d")!, W, H };
}

/** Image-leaf, no-AI-key fallback: photos in a grid + the caption. No journal text — that lives on the text leaf. */
export async function renderFallbackImageCanvas(entry: JournalEntry): Promise<HTMLCanvasElement> {
  const { canvas, ctx, W, H } = makePageCanvas();
  const { palette } = entry.layoutSpec;

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, W, H);

  const pad = 36;
  ctx.fillStyle = palette.ink;
  ctx.globalAlpha = 0.55;
  ctx.font = "italic 22px Georgia, serif";
  ctx.textAlign = "right";
  ctx.fillText(entry.dateLabel, W - pad, pad + 12);
  ctx.globalAlpha = 1;

  const photos = entry.photos.slice(0, 4);
  const gridTop = pad + 44;
  const gridBottom = photos.length > 0 ? H * 0.8 : gridTop;
  if (photos.length > 0) {
    const loaded = await Promise.all(photos.map((p) => loadImage(p).catch(() => null)));
    const cols = photos.length <= 1 ? 1 : 2;
    const rows = Math.ceil(photos.length / cols);
    const gap = 14;
    const cellW = (W - pad * 2 - gap * (cols - 1)) / cols;
    const cellH = (gridBottom - gridTop - gap * (rows - 1)) / rows;
    loaded.forEach((img, i) => {
      if (!img) return;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * (cellW + gap);
      const y = gridTop + row * (cellH + gap);
      const scale = Math.max(cellW / img.width, cellH / img.height);
      const sw = cellW / scale;
      const sh = cellH / scale;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = "#fff";
      ctx.fillRect(x - 4, y - 4, cellW + 8, cellH + 8);
      ctx.restore();
      ctx.drawImage(img, sx, sy, sw, sh, x, y, cellW, cellH);
    });
  }

  // Caption: centered in the remaining space below the photo grid (or,
  // with no photos at all, centered across the whole page as the page's
  // one visual focus).
  const captionTop = photos.length > 0 ? gridBottom + 40 : H * 0.42;
  if (entry.caption) {
    ctx.fillStyle = palette.accent;
    ctx.font = "italic 30px Georgia, serif";
    ctx.textAlign = "center";
    const y = wrapCentered(ctx, `"${entry.caption}"`, W / 2, captionTop, W - pad * 2, 38, 4);
    if (entry.captionAuthor) {
      ctx.globalAlpha = 0.7;
      ctx.font = "italic 20px Georgia, serif";
      ctx.fillText(`— ${entry.captionAuthor}`, W / 2, y);
      ctx.globalAlpha = 1;
    }
  }

  return canvas;
}

function wrapCentered(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, maxWidth: number, lineHeight: number, maxLines: number): number {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (let i = 0; i < words.length && lines.length < maxLines; i++) {
    const test = line ? line + " " + words[i] : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = words[i];
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l) => {
    ctx.fillText(l, cx, y);
    y += lineHeight;
  });
  return y;
}

/** Text leaf: date + the full journal text, always rendered regardless of the image source. */
export async function renderTextCanvas(entry: JournalEntry): Promise<HTMLCanvasElement> {
  const { canvas, ctx, W, H } = makePageCanvas();
  const { palette, texture } = entry.layoutSpec;

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, W, H);

  if (texture === "grid-paper") {
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 26) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  } else if (texture === "dot-paper") {
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let x = 12; x < W; x += 20) {
      for (let y = 12; y < H; y += 20) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const pad = 40;
  ctx.fillStyle = palette.ink;
  ctx.globalAlpha = 0.55;
  ctx.font = "italic 24px Georgia, serif";
  ctx.textAlign = "right";
  ctx.fillText(entry.dateLabel, W - pad, pad + 14);
  ctx.globalAlpha = 1;

  ctx.fillStyle = palette.ink;
  ctx.font = "22px Georgia, serif";
  ctx.textAlign = "left";
  const textTop = pad + 60;
  const maxLines = Math.max(1, Math.floor((H - textTop - pad) / 30));
  wrapText(ctx, entry.text || "", pad, textTop, W - pad * 2, 30, maxLines);

  return canvas;
}

// Canvas dimensions here (and AI-generated image dimensions) aren't
// guaranteed powers of two, and an NPOT texture left at Three.js's default
// mipmapped trilinear filtering is a WebGL "incomplete texture" — it can
// render as garbage/adjacent-memory noise instead of failing loudly. Every
// texture this module hands out needs mipmaps off and edge-clamped linear
// filtering instead.
function finalizeTexture(tex: THREE.Texture): THREE.Texture {
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

interface CacheEntry {
  texture: THREE.Texture;
  key: string;
}

const imageCache = new Map<string, CacheEntry>();
const textCache = new Map<string, CacheEntry>();

function imageKeyFor(entry: JournalEntry): string {
  return entry.aiImage ? "ai:" + entry.aiImage.length : "fallback:" + entry.photos.length + ":" + entry.caption.length;
}

function textKeyFor(entry: JournalEntry): string {
  return "text:" + entry.text.length;
}

function loadCached(
  cache: Map<string, CacheEntry>,
  entry: JournalEntry,
  key: string,
  build: () => Promise<THREE.Texture>,
  onReady: (tex: THREE.Texture) => void
): THREE.Texture | null {
  const cached = cache.get(entry.id);
  if (cached && cached.key === key) return cached.texture;
  build().then((tex) => {
    cache.set(entry.id, { texture: tex, key });
    onReady(tex);
  });
  return null;
}

/**
 * Fetches (and caches) the image-leaf texture for an entry — the AI image
 * if one was generated, otherwise a local canvas fallback. Returns the
 * cached texture synchronously if ready; otherwise kicks off loading and
 * calls `onReady` once available. Callers must guard against the slot
 * having moved on to a different entry by the time the callback fires.
 */
export function getEntryImageTexture(entry: JournalEntry, onReady: (tex: THREE.Texture) => void): THREE.Texture | null {
  return loadCached(
    imageCache,
    entry,
    imageKeyFor(entry),
    async () => {
      // AI pages go through flattenPageImage first: it trims off any
      // photographed frame (margin, tabletop, second sheet) the model drew
      // around the page and fits it to the leaf, so it reads as the page
      // itself rather than a snapshot pasted onto it.
      const canvas = entry.aiImage ? await flattenPageImage(entry.aiImage) : await renderFallbackImageCanvas(entry);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return finalizeTexture(tex);
    },
    onReady
  );
}

/** Frees a deleted entry's cached textures, which would otherwise sit in GPU memory for the session. */
export function forgetEntryTextures(entryId: string) {
  for (const cache of [imageCache, textCache]) {
    cache.get(entryId)?.texture.dispose();
    cache.delete(entryId);
  }
}

/** Fetches (and caches) the text-leaf texture for an entry — always the local text-page canvas. */
export function getEntryTextTexture(entry: JournalEntry, onReady: (tex: THREE.Texture) => void): THREE.Texture | null {
  return loadCached(
    textCache,
    entry,
    textKeyFor(entry),
    async () => {
      const canvas = await renderTextCanvas(entry);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return finalizeTexture(tex);
    },
    onReady
  );
}
