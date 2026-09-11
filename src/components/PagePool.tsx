import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Page, { PageHandle } from "./Page";
import { useBookStore, POOL_SIZE } from "../store/useBookStore";
import { useJournalStore, getTotalPages, getLeafFaces } from "../store/useJournalStore";
import { FRONT_OPEN_ANGLE, BACK_COVER_ANGLE, STACK_GAP, CLOSED_ANGLE } from "../utils/pageBend";
import { readProgress } from "../utils/readProgress";
import { nextPage, prevPage } from "../utils/pageNav";
import { pendingClick } from "../utils/dragCoordinator";

/**
 * Circular page buffer: a fixed pool of POOL_SIZE meshes represents a
 * sliding window of logical page numbers around the current reading
 * position. As the window slides, the mesh that falls out on one side is
 * silently reassigned ("recycled") to the logical page entering on the
 * other, so the album can hold TOTAL_PAGES worth of pages without ever
 * mounting more than POOL_SIZE meshes.
 *
 * Two-pile model (matching a real book, not a wide fan): every not-yet-read
 * page rests flat at FRONT_OPEN_ANGLE, every already-read page rests flat
 * at BACK_COVER_ANGLE — no continuous spread in between. `readProgress`
 * (utils/readProgress.ts) is a continuous 0..TOTAL_PAGES position, eased
 * toward the target page whenever nextPage/prevPage (utils/pageNav.ts) is
 * triggered — clicking the right (unread) pile's topmost page, clicking the
 * left (read) pile's, or the arrow keys. At most one page — the one
 * currently astride the two piles — takes an angle between the two, a
 * direct linear function of the fractional part of that position, tracked
 * with no extra smoothing (the eased tween already shapes the motion).
 * Every other page just rests in its pile with a per-slot Z offset for
 * paper thickness.
 */

const WINDOW_BEFORE = 6; // relative offsets 0..-6
const WINDOW_AFTER = 7; // relative offsets 1..7

function seededJitter(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

interface Transform {
  rotY: number;
  posZ: number;
  rotX: number;
}

// `relative` is logicalIndex - flooredPage (an integer). `f` is the
// fractional part of the reading position — only meaningful when
// relative === 1 (the single page currently astride both piles); at f=0
// that page is fully at rest in the unread pile, at f=1 fully at rest in
// the read pile, so this same formula also covers the settled (non-drag)
// case with no special-casing.
function openTransform(relative: number, f: number, jitter: number): Transform {
  if (relative === 1) {
    return { rotY: THREE.MathUtils.lerp(FRONT_OPEN_ANGLE, BACK_COVER_ANGLE, f), posZ: 0, rotX: jitter };
  }
  if (relative <= 0) {
    // Same reasoning as the unread side below: the active page occupies depth
    // 0, so the read pile has to start one slot deeper. At f=1 the active page
    // has rotated to exactly BACK_COVER_ANGLE — the read pile's own resting
    // angle — so leaving relative === 0 at depth 0 put two pages on precisely
    // the same plane at the same position, and the depth buffer resolved the
    // tie per-fragment: the landing page showed the page beneath it bleeding
    // through across part of its surface for the frames either side of the
    // hand-off.
    const depth = -relative + 1;
    return { rotY: BACK_COVER_ANGLE, posZ: -depth * STACK_GAP, rotX: jitter };
  }
  // relative === 1 (handled above) is always the active page, pinned to
  // depth 0 regardless of f — so the first *resting* unread page starts one
  // slot deeper, at depth 1, not 0 (a depth-2 offset here would coincide
  // with the active page's own depth-0 resting spot and z-fight against it).
  const depth = relative - 1;
  return { rotY: FRONT_OPEN_ANGLE, posZ: -depth * STACK_GAP, rotX: jitter };
}

// Closed: no fan-out, but pages still stack with real depth so the paper
// block's thickness reads at rest (see the reference photo) — same depth
// concept as the open piles, just without any rotation, so opening/closing
// transitions smoothly instead of popping.
function closedTransform(relative: number): Transform {
  // Same slot assignment as openTransform, so closing only has to animate
  // rotation and never shuffles pages through each other in depth. Note the
  // read side is -relative + 1 here too: with a plain -relative, relative 0
  // and relative 1 both landed on depth 0 and z-fought — hidden behind the
  // front cover while fully closed, but exposed mid-open once the cover
  // swings clear and the pages are still near CLOSED_ANGLE.
  const depth = relative <= 0 ? -relative + 1 : relative - 1;
  return { rotY: CLOSED_ANGLE, posZ: -depth * STACK_GAP, rotX: 0 };
}

interface Slot {
  logicalIndex: number; // <= 0 means "doesn't exist yet", slot is hidden
}

export default function PagePool() {
  const handles = useRef<(PageHandle | null)[]>(new Array(POOL_SIZE).fill(null));
  const slots = useRef<Slot[]>(
    Array.from({ length: POOL_SIZE }, (_, i) => {
      const relative = i <= WINDOW_BEFORE ? -i : i - WINDOW_BEFORE;
      return { logicalIndex: relative };
    })
  );
  const lastFloor = useRef(0);

  // Pushes each pool slot's current content down to its Page instance —
  // called on mount and whenever the entries array changes (new page
  // saved/deleted), since appending never shifts already-assigned logical
  // indices (see useJournalStore: new entries always sort to the end).
  function syncAllSlotContent() {
    for (let i = 0; i < POOL_SIZE; i++) {
      handles.current[i]?.setContent(getLeafFaces(slots.current[i].logicalIndex));
    }
  }

  useEffect(() => {
    syncAllSlotContent();
    return useJournalStore.subscribe(() => syncAllSlotContent());
  }, []);

  // Reassigns the slot exiting the trailing edge of the window to the
  // logical page entering the leading edge, snapping it straight to its new
  // resting transform (it's always deep in its pile, never the active page,
  // so there's nothing to animate here — same instant re-window the old
  // per-click implementation did, just triggered by crossing a floor
  // boundary instead of a discrete page-count change).
  function recycleStep(newFloor: number, direction: 1 | -1) {
    const exitingLogical = direction === 1 ? newFloor - 1 - WINDOW_BEFORE : newFloor + 1 + WINDOW_AFTER;
    const enteringLogical = direction === 1 ? newFloor + WINDOW_AFTER : newFloor - WINDOW_BEFORE;
    const exitSlot = slots.current.findIndex((s) => s.logicalIndex === exitingLogical);
    if (exitSlot === -1) return;
    slots.current[exitSlot].logicalIndex = enteringLogical;
    const handle = handles.current[exitSlot];
    if (!handle?.group) return;
    const relative = enteringLogical - newFloor;
    const jitter = (seededJitter(enteringLogical) - 0.5) * 0.05;
    const t = openTransform(relative, 0, jitter);
    handle.group.rotation.set(t.rotX, t.rotY, 0);
    handle.group.position.set(0, 0, t.posZ);
    handle.setContent(getLeafFaces(enteringLogical));
  }

  useFrame(() => {
    const isOpen = useBookStore.getState().isOpen;
    const totalPages = getTotalPages();
    const rawPos = Number.isFinite(readProgress.current) ? readProgress.current : 0;
    const pos = THREE.MathUtils.clamp(rawPos, 0, totalPages);
    const flooredPage = Math.min(Math.floor(pos), totalPages);
    const f = pos - flooredPage;

    while (flooredPage > lastFloor.current) {
      lastFloor.current++;
      recycleStep(lastFloor.current, 1);
    }
    while (flooredPage < lastFloor.current) {
      lastFloor.current--;
      recycleStep(lastFloor.current, -1);
    }

    for (let i = 0; i < POOL_SIZE; i++) {
      const handle = handles.current[i];
      if (!handle?.group) continue;
      const slot = slots.current[i];
      handle.group.visible = slot.logicalIndex > 0 && slot.logicalIndex <= totalPages;
      const relative = slot.logicalIndex - flooredPage;
      const jitter = (seededJitter(slot.logicalIndex) - 0.5) * 0.05;

      if (!isOpen) {
        const target = closedTransform(relative);
        handle.group.rotation.y = THREE.MathUtils.lerp(handle.group.rotation.y, target.rotY, 0.18);
        handle.group.rotation.x = THREE.MathUtils.lerp(handle.group.rotation.x, target.rotX, 0.18);
        handle.group.position.z = THREE.MathUtils.lerp(handle.group.position.z, target.posZ, 0.18);
        continue;
      }

      const target = openTransform(relative, f, jitter);
      if (relative === 1) {
        // The actively dragged/thrown page: track the gesture exactly, no
        // smoothing lag.
        handle.group.rotation.y = target.rotY;
        handle.group.rotation.x = target.rotX;
        handle.group.position.z = target.posZ;
      } else {
        handle.group.rotation.y = THREE.MathUtils.lerp(handle.group.rotation.y, target.rotY, 0.25);
        handle.group.rotation.x = THREE.MathUtils.lerp(handle.group.rotation.x, target.rotX, 0.25);
        handle.group.position.z = THREE.MathUtils.lerp(handle.group.position.z, target.posZ, 0.25);
      }
    }
  });

  return (
    <group>
      {Array.from({ length: POOL_SIZE }, (_, i) => (
        <Page
          key={i}
          ref={(h) => {
            handles.current[i] = h;
          }}
          onPointerDown={() => {
            if (!useBookStore.getState().isOpen) return;
            // Whichever pile this slot is currently in at the moment of the
            // click decides the direction: the unread (right) pile advances,
            // the read (left) pile goes back — so clicking a page reads as
            // "go toward it" rather than always just "next".
            const relative = slots.current[i].logicalIndex - lastFloor.current;
            pendingClick.action = relative <= 0 ? prevPage : nextPage;
          }}
        />
      ))}
    </group>
  );
}
