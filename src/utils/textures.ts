import * as THREE from "three";

/**
 * All textures here are generated procedurally on <canvas>, so the project
 * runs with zero binary assets. They are stand-ins — see README.md for the
 * real photographed/designed assets that should replace them for an exact
 * match to the reference photo.
 */

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx };
}

function toTexture(canvas: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---------------------------------------------------------------------------
// Kraft brown cover paper: fibrous, mottled, visibly textured
// ---------------------------------------------------------------------------
let _kraft: { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } | null = null;

export function getKraftPaperTextures() {
  if (_kraft) return _kraft;
  const size = 1024;
  const rand = seededRandom(1337);

  // color map
  const { canvas: colorCanvas, ctx: cctx } = makeCanvas(size);
  const base = cctx.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, "#9c7444");
  base.addColorStop(0.5, "#8a6238");
  base.addColorStop(1, "#7c5730");
  cctx.fillStyle = base;
  cctx.fillRect(0, 0, size, size);

  // mottling blobs
  for (let i = 0; i < 260; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 8 + rand() * 60;
    const shade = rand() > 0.5 ? "rgba(60,38,16,0.06)" : "rgba(210,175,120,0.07)";
    cctx.fillStyle = shade;
    cctx.beginPath();
    cctx.ellipse(x, y, r, r * (0.5 + rand() * 0.6), rand() * Math.PI, 0, Math.PI * 2);
    cctx.fill();
  }

  // fibrous streaks
  for (let i = 0; i < 2200; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 4 + rand() * 22;
    const angle = rand() * Math.PI;
    const light = rand() > 0.5;
    cctx.strokeStyle = light ? "rgba(230,200,150,0.10)" : "rgba(40,25,10,0.10)";
    cctx.lineWidth = 0.6 + rand() * 1;
    cctx.beginPath();
    cctx.moveTo(x, y);
    cctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    cctx.stroke();
  }

  // fine grain
  const imgData = cctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (rand() - 0.5) * 14;
    data[i] += n;
    data[i + 1] += n;
    data[i + 2] += n;
  }
  cctx.putImageData(imgData, 0, 0);

  const map = toTexture(colorCanvas, true);
  map.repeat.set(1, 1);

  // normal map derived from a fresh grayscale fiber pass (cheap fake normal)
  const { canvas: nCanvas, ctx: nctx } = makeCanvas(size);
  nctx.fillStyle = "#8080ff";
  nctx.fillRect(0, 0, size, size);
  const rand2 = seededRandom(4242);
  for (let i = 0; i < 3200; i++) {
    const x = rand2() * size;
    const y = rand2() * size;
    const len = 3 + rand2() * 18;
    const angle = rand2() * Math.PI;
    const gx = Math.cos(angle);
    const gy = Math.sin(angle);
    nctx.strokeStyle = `rgba(${128 + gx * 40},${128 + gy * 40},255,0.5)`;
    nctx.lineWidth = 1;
    nctx.beginPath();
    nctx.moveTo(x, y);
    nctx.lineTo(x + gx * len, y + gy * len);
    nctx.stroke();
  }
  const normalMap = toTexture(nCanvas, false);

  // roughness map: mostly rough, slightly varied
  const { canvas: rCanvas, ctx: rctx } = makeCanvas(256);
  rctx.fillStyle = "#c9c9c9";
  rctx.fillRect(0, 0, 256, 256);
  const rand3 = seededRandom(99);
  for (let i = 0; i < 800; i++) {
    const x = rand3() * 256;
    const y = rand3() * 256;
    const r = rand3() * 6;
    rctx.fillStyle = `rgba(255,255,255,${rand3() * 0.08})`;
    rctx.beginPath();
    rctx.arc(x, y, r, 0, Math.PI * 2);
    rctx.fill();
  }
  const roughnessMap = toTexture(rCanvas, false);

  _kraft = { map, normalMap, roughnessMap };
  return _kraft;
}

// ---------------------------------------------------------------------------
// Interior page paper: warm cream/ivory, subtle fiber grain
// ---------------------------------------------------------------------------
let _pagePaper: { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture } | null = null;

export function getPagePaperTextures() {
  if (_pagePaper) return _pagePaper;
  const size = 512;
  const rand = seededRandom(777);

  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = "#f3ecda";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 900; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 4 + rand() * 18;
    ctx.fillStyle = rand() > 0.5 ? "rgba(255,250,235,0.05)" : "rgba(150,130,95,0.04)";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.6, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (rand() - 0.5) * 6;
    data[i] += n;
    data[i + 1] += n;
    data[i + 2] += n;
  }
  ctx.putImageData(imgData, 0, 0);
  const map = toTexture(canvas, true);

  const { canvas: nCanvas, ctx: nctx } = makeCanvas(size);
  nctx.fillStyle = "#8080ff";
  nctx.fillRect(0, 0, size, size);
  const rand2 = seededRandom(321);
  for (let i = 0; i < 1400; i++) {
    const x = rand2() * size;
    const y = rand2() * size;
    const len = 2 + rand2() * 8;
    const angle = rand2() * Math.PI;
    nctx.strokeStyle = `rgba(${128 + Math.cos(angle) * 18},${128 + Math.sin(angle) * 18},255,0.35)`;
    nctx.lineWidth = 0.6;
    nctx.beginPath();
    nctx.moveTo(x, y);
    nctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    nctx.stroke();
  }
  const normalMap = toTexture(nCanvas, false);

  _pagePaper = { map, normalMap };
  return _pagePaper;
}

// ---------------------------------------------------------------------------
// Deckle / torn edge alpha strip — applied along page borders
// ---------------------------------------------------------------------------
let _deckle: THREE.CanvasTexture | null = null;

export function getDeckleEdgeAlpha() {
  if (_deckle) return _deckle;
  const w = 512;
  const h = 32;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const rand = seededRandom(55);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 6) {
    const jag = h * 0.55 + (rand() - 0.5) * h * 0.5;
    ctx.lineTo(x, jag);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  _deckle = tex;
  return _deckle;
}

// ---------------------------------------------------------------------------
// Gold spiral-binding coil texture (color + roughness for a metal material)
// ---------------------------------------------------------------------------
let _goldCoil: { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } | null = null;

export function getGoldCoilTextures() {
  if (_goldCoil) return _goldCoil;
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0, "#7a5a1e");
  grad.addColorStop(0.25, "#e9c873");
  grad.addColorStop(0.5, "#fff3cf");
  grad.addColorStop(0.75, "#d4a94a");
  grad.addColorStop(1, "#8a6520");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const map = toTexture(canvas, true);

  const { canvas: rCanvas, ctx: rctx } = makeCanvas(size);
  const rgrad = rctx.createLinearGradient(0, 0, size, 0);
  rgrad.addColorStop(0, "#555");
  rgrad.addColorStop(0.5, "#111");
  rgrad.addColorStop(1, "#555");
  rctx.fillStyle = rgrad;
  rctx.fillRect(0, 0, size, size);
  const roughnessMap = toTexture(rCanvas, false);

  _goldCoil = { map, roughnessMap };
  return _goldCoil;
}

// ---------------------------------------------------------------------------
// Black satin ribbon: subtle sheen streaks via normal map
// ---------------------------------------------------------------------------
let _satin: { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture } | null = null;

export function getSatinRibbonTextures() {
  if (_satin) return _satin;
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = "#0b0b0d";
  ctx.fillRect(0, 0, size, size);
  const sheen = ctx.createLinearGradient(0, 0, size, size);
  sheen.addColorStop(0, "rgba(255,255,255,0.02)");
  sheen.addColorStop(0.45, "rgba(255,255,255,0.10)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0.16)");
  sheen.addColorStop(0.55, "rgba(255,255,255,0.10)");
  sheen.addColorStop(1, "rgba(255,255,255,0.02)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, size, size);
  const map = toTexture(canvas, true);

  const { canvas: nCanvas, ctx: nctx } = makeCanvas(size);
  nctx.fillStyle = "#8080ff";
  nctx.fillRect(0, 0, size, size);
  for (let x = 0; x < size; x += 3) {
    nctx.strokeStyle = "rgba(150,150,255,0.25)";
    nctx.beginPath();
    nctx.moveTo(x, 0);
    nctx.lineTo(x, size);
    nctx.stroke();
  }
  const normalMap = toTexture(nCanvas, false);

  _satin = { map, normalMap };
  return _satin;
}

// ---------------------------------------------------------------------------
// Ransom-note "memories" letter tiles
// ---------------------------------------------------------------------------
const FONTS = [
  "italic 700 ",
  "700 ",
  "900 ",
  "400 ",
  "italic 400 ",
  "700 ",
];
const FONT_FAMILIES = [
  "Georgia",
  "'Times New Roman', serif",
  "Impact, sans-serif",
  "'Courier New', monospace",
  "Arial, sans-serif",
  "'Comic Sans MS', cursive",
];

export function makeLetterTileTexture(letter: string, index: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = seededRandom(index * 97 + letter.charCodeAt(0));

  ctx.clearRect(0, 0, size, size);

  // small paper tile background
  const pad = 8;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  const tileColor = rand() > 0.5 ? "#fdfbf3" : "#f0ede0";
  ctx.fillStyle = tileColor;
  ctx.beginPath();
  const jx = (rand() - 0.5) * 4;
  const jy = (rand() - 0.5) * 4;
  ctx.rect(pad + jx, pad + jy, size - pad * 2, size - pad * 2);
  ctx.fill();
  ctx.restore();

  // slight torn/rough tile border
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(pad + jx, pad + jy, size - pad * 2, size - pad * 2);

  // letter — random font, weight, case
  const upper = rand() > 0.35;
  const char = upper ? letter.toUpperCase() : letter.toLowerCase();
  const weight = FONTS[Math.floor(rand() * FONTS.length)];
  const family = FONT_FAMILIES[Math.floor(rand() * FONT_FAMILIES.length)];
  const isBlack = rand() > 0.4;
  ctx.fillStyle = isBlack ? "#151515" : "#1a1a1a";
  ctx.font = `${weight}${58 + rand() * 14}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(size / 2, size / 2 + 2);
  ctx.rotate((rand() - 0.5) * 0.18);
  ctx.fillText(char, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// Advisory sticker — generic stylized label (not the official RIAA mark)
// ---------------------------------------------------------------------------
let _advisory: THREE.CanvasTexture | null = null;

export function getAdvisoryStickerTexture(): THREE.CanvasTexture {
  if (_advisory) return _advisory;
  const w = 320;
  const h = 180;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, w - 12, h - 12);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "700 26px Arial, sans-serif";
  ctx.fillText("PARENTAL", w / 2, 56);
  ctx.fillText("ADVISORY", w / 2, 88);
  ctx.font = "400 15px Arial, sans-serif";
  ctx.fillText("EXPLICIT CONTENT", w / 2, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  _advisory = tex;
  return _advisory;
}

// ---------------------------------------------------------------------------
// Cream stitch-button texture (button face w/ 4 stitch holes)
// ---------------------------------------------------------------------------
let _button: THREE.CanvasTexture | null = null;

export function getButtonTexture(): THREE.CanvasTexture {
  if (_button) return _button;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.46;

  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  grad.addColorStop(0, "#f2e6c9");
  grad.addColorStop(1, "#d8c295");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(120,95,55,0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const holeR = size * 0.055;
  const holeOffset = size * 0.14;
  ctx.fillStyle = "#5c4322";
  [
    [cx - holeOffset, cy - holeOffset],
    [cx + holeOffset, cy - holeOffset],
    [cx - holeOffset, cy + holeOffset],
    [cx + holeOffset, cy + holeOffset],
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, holeR, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  _button = tex;
  return _button;
}
