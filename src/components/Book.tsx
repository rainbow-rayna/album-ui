import { useEffect, useRef, useState } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import Cover, { COVER_WIDTH, COVER_HEIGHT } from "./Cover";
import PagePool from "./PagePool";
import SpiralBinding from "./appliques/SpiralBinding";
import { useBookStore, isOverlayOpen } from "../store/useBookStore";
import { useJournalStore } from "../store/useJournalStore";
import { pendingClick } from "../utils/dragCoordinator";
import { navigateTo } from "../utils/pageNav";
import { FRONT_COVER_Z, getBackCoverZ } from "../utils/pageBend";

// A real coil doesn't just reach each cover, it pokes out slightly past its
// punched edge on both sides — sized to land exactly on the cover surface,
// it read as passing *behind* the cover instead of through it.
const COIL_POKE = 0.03;

const BASE_TILT = THREE.MathUtils.degToRad(-6); // propped slightly backward, like a book on a stand, closed only
// Open reading angle — deep enough that the top edge (leaning away) reads
// as visibly farther than the bottom edge (leaning toward the viewer), the
// linear-perspective cue a reclined book needs. This has to be the page's
// own rotation, not just camera elevation: CameraRig's open camera sits
// close to the page's own height (not high above it) precisely so this
// tilt's front-to-back offset is what drives the recession, rather than
// the camera-looking-down-at-a-vertical-wall effect fighting it and
// flipping the perspective the wrong way (top reading as nearer, not
// farther — see CameraRig.tsx's OPEN_CAMERA_POS comment).
const OPEN_TILT = THREE.MathUtils.degToRad(-32);
const CLICK_MOVE_THRESHOLD = 6; // px — below this, a pointer-up counts as a click, not a drag/orbit
// A left-to-right drag past this distance closes an open album — tracked
// independently of the click-vs-drag state below so it works anywhere on
// screen, not just starting on the album itself.
const SWIPE_CLOSE_DISTANCE = 90;

interface DragState {
  startX: number;
  startY: number;
  moved: boolean;
}

export default function Book() {
  const groupRef = useRef<THREE.Group>(null!);
  const dragState = useRef<DragState | null>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  // Recomputed whenever the entry count changes (rare) rather than every
  // frame — the coil only needs to move when the back cover's own target Z
  // actually shifts, which only happens as pages are added/removed.
  const totalPages = useJournalStore((s) => s.entries.length * 2);
  const backCoverZ = getBackCoverZ(totalPages);
  const coilCenterZ = (FRONT_COVER_Z + backCoverZ) / 2;
  const coilDepthRadius = (FRONT_COVER_Z - backCoverZ) / 2 + COIL_POKE;

  // Both states keep a backward tilt — shallower closed (propped on a
  // stand), deeper open (reclined like a book actually being read) — see
  // OPEN_TILT above for why this has to be the page's own rotation, not
  // just the camera's.
  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const isOpen = useBookStore.getState().isOpen;
    const targetTilt = isOpen ? OPEN_TILT : BASE_TILT;
    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetTilt, 4, dt);
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      // Arrow keys inside an overlay (moving the caret in the composer's
      // inputs, say) must not flip pages behind it.
      if (isOverlayOpen()) return;
      const { isOpen, currentPage, toggleOpen } = useBookStore.getState();
      // Opening is a real book with nothing to flip through yet — a page
      // key with the cover shut just opens it, matching the click behavior.
      if (!isOpen) {
        if (e.key === "ArrowRight") toggleOpen();
        return;
      }
      navigateTo(currentPage + (e.key === "ArrowRight" ? 1 : -1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // The album itself never moves — OrbitControls (in Experience.tsx) owns
  // the actual camera drag. These listeners exist only to tell a plain
  // click (no meaningful movement) apart from a drag-to-orbit, so clicking
  // a page or cover still works without also firing mid-orbit.
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const state = dragState.current;
      if (!state) return;
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      if (Math.hypot(dx, dy) > CLICK_MOVE_THRESHOLD) state.moved = true;
    };
    const handleUp = () => {
      const state = dragState.current;
      dragState.current = null;
      // A release with no meaningful movement is a click: whichever mesh
      // was pressed (a cover or a page) already recorded what that means.
      if (state && !state.moved) pendingClick.action?.();
      pendingClick.action = null;
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  // Closing is a swipe, not a click, tracked independently of the mesh-click
  // drag state above so it works anywhere on screen — not just starting on
  // the album — and never fights with page-click detection (a long drag
  // sets `moved`, which already suppresses the click action above).
  useEffect(() => {
    let start: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      start = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      const from = start;
      start = null;
      if (!from || !useBookStore.getState().isOpen || isOverlayOpen()) return;
      const dx = e.clientX - from.x;
      const dy = e.clientY - from.y;
      if (dx > SWIPE_CLOSE_DISTANCE && dx > Math.abs(dy) * 1.5) {
        useBookStore.getState().toggleOpen();
      }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    dragState.current = { startX: e.clientX, startY: e.clientY, moved: false };
  };

  return (
    // The album never moves in X/Z — OrbitControls moves the camera around
    // it instead. Its pitch does animate (see the useFrame above): tilted
    // back for the closed "propped on a stand" look, level once open.
    <group
      ref={groupRef}
      rotation={[BASE_TILT, 0, 0]}
      onPointerDown={handlePointerDown}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <group position={[-COVER_WIDTH / 2, 0, 0]}>
        <Cover variant="back" />
        <PagePool />
        <Cover variant="front" />
        {/* A single spiral binding for the whole album, independent of both
            covers — one continuous coil running the length of the spine
            (matching a real spiral-bound book, where one coil threads
            through both covers and every page) rather than each cover
            rendering its own separate copy, which read as two coils side
            by side. Living here instead of as a child of either cover also
            means it isn't dragged along by whatever rotation either cover
            animates through (the front cover flips face-down once open).
            Centered and sized to poke past both covers' actual current Z
            (coilCenterZ/coilDepthRadius above, tracking the same
            getBackCoverZ the back cover itself uses) rather than a fixed
            size — a book with more pages needs a visibly bigger coil to
            still reach (and poke past) its now-farther-back cover. */}
        <group position={[0, 0, coilCenterZ]}>
          <SpiralBinding height={COVER_HEIGHT * 0.94} x={0.02} depthRadius={coilDepthRadius} />
        </group>
      </group>
    </group>
  );
}
