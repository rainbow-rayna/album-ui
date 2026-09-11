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
// The "unread" pile's resting angle — 0, flush with the spine plane, so it's
// exactly COVER_SWEEP (180°) from BACK_COVER_ANGLE below and the two piles
// sit perfectly coplanar (a flat open spread, no crease) rather than meeting
// at a V-shaped angle.
export const FRONT_OPEN_ANGLE = 0;
export const BACK_COVER_ANGLE = -COVER_SWEEP; // the "read" pile's resting angle (math only — see BACK_COVER_OPEN_ANGLE)

// Every other depth constant in this file (and the covers' Z, in Cover.tsx)
// is a multiple of this one, on purpose: at this camera's near/far range,
// the depth buffer can't reliably tell apart two surfaces closer together
// than roughly this — closer than that and they z-fight, which renders as
// a hard-edged mix of both surfaces' content instead of just the one that
// should be facing the camera (this is what a page rendering with a stray
// band of a *different* page's imagery on it means: two surfaces landed
// within one of these of each other). Each leaf (Page.tsx) is built from
// two full-thickness boxes, one per face, offset ±FACE_OFFSET apart so
// they clear this margin from each other; every constant below has to
// clear it from whatever it can end up sitting next to as well, or the
// exact same failure reappears one level up (adjacent leaves in a pile,
// leaf vs. cover, etc.) — that already happened once when STACK_GAP was
// tightened without carrying the same margin to the covers' Z below, so
// don't hand-tune any of these independently again.
const MIN_DEPTH_SEPARATION = 0.02;

export const FACE_OFFSET = MIN_DEPTH_SEPARATION / 2;

// Pages in a pile sit this far apart in depth. One leaf's own two faces
// already span 2×FACE_OFFSET + PAGE_DEPTH; the next leaf in the same pile
// has to clear that whole footprint plus its own margin, not just
// FACE_OFFSET again.
export const STACK_GAP = 2 * FACE_OFFSET + PAGE_DEPTH + MIN_DEPTH_SEPARATION;

// A page's resting angle can coincide exactly with BACK_COVER_ANGLE (the
// last read page approaches it asymptotically). Without a real depth
// separation those coincident planes z-fight. FRONT_COVER_Z sits just in
// front of every closed-stack page (clearing the topmost page's own
// FACE_OFFSET-separated front face).
export const FRONT_COVER_Z = FACE_OFFSET + MIN_DEPTH_SEPARATION;

// BACK_COVER_Z needs to clear whatever the read pile's *actual* deepest
// rendered page currently is, not a fixed worst case — WINDOW_BEFORE
// (PagePool.tsx) caps that at 6 slots, but a book with only a couple of
// pages never gets anywhere near that deep. Sizing the back cover for the
// worst case unconditionally left it sitting far behind a short book's
// actual last page, which read as a visible gap between the back cover and
// the pages in front of it. getBackCoverZ takes the real page count
// (getTotalPages(), from useJournalStore) and only recedes as far as that
// book's pages actually reach, capped at the same worst case a long book
// would need.
// PagePool's read pile is depth = -relative + 1, so a fully-read book of N
// leaves puts its deepest page at slot N (and the pool window caps that at
// WINDOW_BEFORE + 1 = 7). The cover then sits one slot deeper again, which is
// the clearance this has always carried — sizing it to the deepest page
// exactly would put the cover inside that page's own FACE_OFFSET/PAGE_DEPTH
// footprint and z-fight against it.
const DEEPEST_READ_SLOT = 7;
export function getBackCoverZ(totalPages: number): number {
  const deepestPage = Math.min(DEEPEST_READ_SLOT, totalPages);
  return -((deepestPage + 1) * STACK_GAP + MIN_DEPTH_SEPARATION);
}

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
// out past the actual pages piled on top of it. Tracks getBackCoverZ (not a
// fixed offset) for the same reason getBackCoverZ itself is dynamic: a
// short book's back cover already sits much closer than the worst case, and
// the front cover (once open) needs to stay just behind *that*, not behind
// some fixed distant point.
export function getFrontCoverOpenZ(totalPages: number): number {
  return getBackCoverZ(totalPages) - 0.03;
}

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
