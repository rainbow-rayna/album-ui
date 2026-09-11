import { DOODLES, FONTS, PALETTES, TEXTURES, TORN_CLIPS } from './constants';
import type { Decoration, Family, LayoutSpec, Palette, PhotoShape, PhotoSpec } from './types';
import { clamp, pick, randomBetween } from './helpers';

function buildScatterSpecs(count: number, forceCircle: boolean): PhotoSpec[] {
  const SLOTS: Record<number, [number, number][]> = {
    1: [[50, 42]],
    2: [[30, 35], [68, 52]],
    3: [[24, 28], [64, 32], [45, 64]],
    4: [[22, 24], [62, 20], [28, 60], [72, 60]],
    5: [[18, 20], [50, 16], [80, 26], [28, 58], [68, 64]],
    6: [[14, 18], [40, 14], [68, 18], [18, 54], [46, 60], [76, 56]],
  };
  const bucket = Math.min(count, 6);
  const baseSlots = SLOTS[bucket];
  const specs: PhotoSpec[] = [];
  for (let i = 0; i < count; i++) {
    const slot = baseSlots[i % baseSlots.length];
    const left = clamp(slot[0] + randomBetween(-6, 6), 8, 88);
    const top = clamp(slot[1] + randomBetween(-6, 6), 6, 78);
    const width = randomBetween(count <= 2 ? 46 : count <= 4 ? 34 : 26, count <= 2 ? 58 : count <= 4 ? 44 : 34);
    const shape: PhotoShape = forceCircle ? 'circle' : pick<PhotoShape>(['square', 'square', 'torn', 'circle']);
    const spec: PhotoSpec = {
      left,
      top,
      width,
      height: shape === 'circle' ? width : width * randomBetween(0.9, 1.15),
      rotation: forceCircle ? randomBetween(-6, 6) : randomBetween(-14, 14),
      shape,
      tape: !forceCircle && shape !== 'circle' && Math.random() < 0.6,
      z: i,
    };
    if (spec.shape === 'torn') spec.tornClip = pick(TORN_CLIPS);
    specs.push(spec);
  }
  return specs;
}

function buildGridSpecs(count: number): PhotoSpec[] {
  const specs: PhotoSpec[] = [];
  for (let i = 0; i < count; i++) {
    const shape: PhotoShape = pick<PhotoShape>(['square', 'square', 'torn']);
    const spec: PhotoSpec = { shape, rotation: randomBetween(-3, 3) };
    if (shape === 'torn') spec.tornClip = pick(TORN_CLIPS);
    specs.push(spec);
  }
  return specs;
}

function buildFilmstripSpecs(count: number): PhotoSpec[] {
  const specs: PhotoSpec[] = [];
  const width = 100 / count;
  for (let i = 0; i < count; i++) {
    const shape: PhotoShape = Math.random() < 0.8 ? 'square' : 'torn';
    const spec: PhotoSpec = {
      left: i * width + width * 0.06,
      top: 30 + randomBetween(-4, 4),
      width: width * 0.84,
      height: 34,
      rotation: (i % 2 === 0 ? -1 : 1) * randomBetween(2, 7),
      shape,
      tape: true,
      z: i,
    };
    if (shape === 'torn') spec.tornClip = pick(TORN_CLIPS);
    specs.push(spec);
  }
  return specs;
}

function buildDecorations(palette: Palette): Decoration[] {
  const decos: Decoration[] = [];
  const n = Math.round(randomBetween(2, 4));
  const types = Object.keys(DOODLES) as (keyof typeof DOODLES)[];
  for (let i = 0; i < n; i++) {
    decos.push({
      type: pick(types),
      left: randomBetween(5, 88),
      top: randomBetween(5, 82),
      size: randomBetween(18, 30),
      rotation: randomBetween(-25, 25),
      color: pick([palette.accent, ...palette.tapes]),
    });
  }
  const tapeCount = Math.round(randomBetween(1, 3));
  for (let i = 0; i < tapeCount; i++) {
    decos.push({
      type: 'tape',
      left: randomBetween(5, 78),
      top: randomBetween(3, 88),
      size: randomBetween(34, 54),
      rotation: randomBetween(-30, 30),
      color: pick(palette.tapes),
    });
  }
  return decos;
}

export function generateLayout(count: number, family: Family): LayoutSpec {
  const palette = pick(PALETTES);
  const font = pick(FONTS);
  const texture = pick(TEXTURES);
  let photoSpecs: PhotoSpec[] = [];
  if (count > 0) {
    if (family === 'grid') photoSpecs = buildGridSpecs(count);
    else if (family === 'filmstrip') photoSpecs = buildFilmstripSpecs(count);
    else if (family === 'circles') photoSpecs = buildScatterSpecs(count, true);
    else photoSpecs = buildScatterSpecs(count, false);
    photoSpecs.forEach((s) => {
      if (s.tape) s.tapeColor = pick(palette.tapes);
    });
  }
  return {
    family,
    palette,
    font,
    texture,
    photoSpecs,
    decorations: buildDecorations(palette),
    textRotation: randomBetween(-2, 2),
    textFontSize: randomBetween(1.05, 1.35),
  };
}
