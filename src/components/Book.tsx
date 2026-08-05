import { useEffect, useRef, useState } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import Cover, { COVER_WIDTH } from "./Cover";
import PagePool from "./PagePool";
import { useBookStore } from "../store/useBookStore";
import { pendingClick } from "../utils/dragCoordinator";
import { navigateTo } from "../utils/pageNav";

const BASE_TILT = THREE.MathUtils.degToRad(-6); // propped slightly backward, like a book on a stand, closed only
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

  // The "propped on a stand" pitch only makes sense for the closed cover —
  // once open, the fan should read level (its middle hinge parallel to the
  // horizon) rather than carrying that tilt into the reading view.
  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const isOpen = useBookStore.getState().isOpen;
    const targetTilt = isOpen ? 0 : BASE_TILT;
    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetTilt, 4, dt);
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
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
      if (!from || !useBookStore.getState().isOpen) return;
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
      </group>
    </group>
  );
}
