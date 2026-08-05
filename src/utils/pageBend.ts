import * as THREE from "three";

/**
 * Bone-chain page geometry, in the spirit of Wawa Sensei's "3D Book Slider"
 * tutorial: each page is a BoxGeometry skinned to a chain of bones running
 * from the spine to the outer edge. A flip is a plain rigid rotation of the
 * whole page (see PagePool) — the bones stay flat and only exist to satisfy
 * the skinned-mesh geometry's skinIndex/skinWeight attributes.
 */

export const PAGE_WIDTH = 1.15;
export const PAGE_HEIGHT = 1.55;
export const PAGE_DEPTH = 0.0025;
export const PAGE_SEGMENTS = 20; // bone count along the width
export const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;

// The two resting spots pages settle into, for PagePool's two-stack model:
// every not-yet-read page rests flat at FRONT_OPEN_ANGLE (the "unread"
// pile), every already-read page rests flat at BACK_COVER_ANGLE (the "read"
// pile) — no continuous fan in between. Only the single page currently
// being dragged/thrown between the two piles takes any angle in between.
// Neither cover mesh actually rotates to these two angles though — each has
// its own, separate open-rotation constant below, decoupled from this and
// from reading progress entirely.
export const COVER_SWEEP = Math.PI; // 180°, the two piles' angular separation
export const CLOSED_ANGLE = 0; // both covers flat/closed, hiding both piles
export const FRONT_OPEN_ANGLE = THREE.MathUtils.degToRad(-30); // the "unread" pile's resting angle
export const BACK_COVER_ANGLE = -COVER_SWEEP; // the "read" pile's resting angle (math only — see BACK_COVER_OPEN_ANGLE)
export const STACK_GAP = 0.012;

// A page's resting angle can coincide exactly with BACK_COVER_ANGLE (the
// last read page approaches it asymptotically). Without a real depth
// separation those coincident planes z-fight. FRONT_COVER_Z sits just in
// front of every closed-stack page; BACK_COVER_Z sits well behind the
// deepest one the pool renders.
export const FRONT_COVER_Z = 0.006;
export const BACK_COVER_Z = -0.2;

// The front cover's own open behavior is a rigid, one-time hardcover flip —
// fully decoupled from PagePool's hinge/fan math (which only governs how
// *interior* pages redistribute as reading progress changes) and from the
// back cover's own rotation. It rotates a fixed 180° to lie flat, face-down,
// and stays there permanently once open; it was "opened" first, so it
// belongs at the very back of the already-read pile for the rest of the
// session. FRONT_OPEN_ANGLE above is unrelated (it only shapes the pages'
// own fan).
export const FRONT_COVER_OPEN_ANGLE = -Math.PI;

// Once open, the front cover is the permanent bottom-most layer of the read
// stack — deeper than every page depth the pool renders — so it never pokes
// out past the actual pages piled on top of it. A fixed offset, not
// computed from reading progress, keeps it there no matter how many pages
// get turned afterward.
export const FRONT_COVER_OPEN_Z = BACK_COVER_Z - 0.03;

// The back cover's own open rotation mirrors the front cover's: opposite
// rotational direction (front swings negative, back swings positive — two
// hardcovers opening away from each other rather than both sweeping the
// same way) and just a hair — 1° — rather than the front's full 180°, so
// it ends up barely ajar rather than lying flat. This is intentionally
// different from BACK_COVER_ANGLE above (which only shapes where the
// *page* fan ends, on the front's side of the circle).
export const BACK_COVER_OPEN_ANGLE = THREE.MathUtils.degToRad(1);

export function buildPageGeometry(): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(
    PAGE_WIDTH,
    PAGE_HEIGHT,
    PAGE_DEPTH,
    PAGE_SEGMENTS,
    2,
    2
  );
  // shift so the spine edge sits at local x = 0 (the hinge/pivot)
  geometry.translate(PAGE_WIDTH / 2, 0, 0);

  const position = geometry.attributes.position;
  const vertexCount = position.count;
  const skinIndices = new Float32Array(vertexCount * 4);
  const skinWeights = new Float32Array(vertexCount * 4);

  for (let i = 0; i < vertexCount; i++) {
    const x = position.getX(i);
    const segment = x / SEGMENT_WIDTH;
    const boneIndex = Math.min(Math.floor(segment), PAGE_SEGMENTS - 1);
    const weight = segment - boneIndex;

    skinIndices[i * 4] = boneIndex;
    skinIndices[i * 4 + 1] = Math.min(boneIndex + 1, PAGE_SEGMENTS);
    skinWeights[i * 4] = 1 - weight;
    skinWeights[i * 4 + 1] = weight;
  }

  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));

  return geometry;
}

export function buildBoneChain(): { bones: THREE.Bone[]; skeleton: THREE.Skeleton } {
  const bones: THREE.Bone[] = [];
  for (let i = 0; i <= PAGE_SEGMENTS; i++) {
    const bone = new THREE.Bone();
    bone.position.x = i === 0 ? 0 : SEGMENT_WIDTH;
    bones.push(bone);
    if (i > 0) bones[i - 1].add(bone);
  }
  const skeleton = new THREE.Skeleton(bones);
  return { bones, skeleton };
}
