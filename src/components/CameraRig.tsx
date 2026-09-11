import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useBookStore } from "../store/useBookStore";

// Must match the PerspectiveCamera's initial position/target in App.tsx —
// this is where the closed, orbit-able "propped on a stand" view lives.
const DEFAULT_CAMERA_POS: [number, number, number] = [1.7, 0.6, 3.8];
const DEFAULT_TARGET: [number, number, number] = [0, 0.05, 0];

// Centered on the spine (Book.tsx offsets the whole cover/page assembly by
// -COVER_WIDTH/2 on X, so that's where the hinge actually sits in world
// space — not the fan's bounding-box center, which is what this used to
// target). Azimuth looks straight at the spine head-on rather than aligning
// with either pile's resting angle, so the two piles read as symmetric
// left/right of center (like a normal open book) instead of the view being
// biased toward making one side face-on at the cost of the whole book
// sliding off to one side of frame.
//
// Y is kept close to the target's height on purpose, not elevated well
// above it: a camera positioned high above a mostly-vertical page sees the
// page's top edge (nearest the camera's own height) as the *closer* one —
// backwards from the reclined-book look, where the top should read as
// farther away. Book.tsx's OPEN_TILT is what actually leans the top edge
// back; this camera just needs to be low enough that the tilt's effect
// isn't fighting/overridden by that elevation-driven distance flip.
const OPEN_CAMERA_POS: [number, number, number] = [-0.6, 0.87, 3.94];
const OPEN_TARGET: [number, number, number] = [-0.6, -0.05, 0];

const TRANSITION_DURATION = 1.4;

interface CameraRigProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef: React.RefObject<any>;
  setOrbitEnabled: (enabled: boolean) => void;
}

/**
 * Drives the camera + OrbitControls between two fixed framings based on
 * `isOpen`: the closed, freely-orbitable propped view, and the open,
 * locked-down top-down view (like looking down at a book lying open on a
 * surface). Orbiting is disabled the instant the album opens and only
 * re-enabled once the reverse transition (on close) finishes.
 *
 * `enabled` is driven through React state (setOrbitEnabled → a prop on
 * <OrbitControls> in Experience.tsx) rather than only poking
 * `controls.enabled` imperatively — that's the reliable way to gate drei's
 * OrbitControls; a bare imperative set doesn't consistently stick.
 */
export default function CameraRig({ controlsRef, setOrbitEnabled }: CameraRigProps) {
  const { camera } = useThree();
  const isOpen = useBookStore((s) => s.isOpen);
  const hasMounted = useRef(false);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const [px, py, pz] = isOpen ? OPEN_CAMERA_POS : DEFAULT_CAMERA_POS;
    const [tx, ty, tz] = isOpen ? OPEN_TARGET : DEFAULT_TARGET;

    if (!hasMounted.current) {
      // Settle into the correct starting state instantly, no transition.
      hasMounted.current = true;
      camera.position.set(px, py, pz);
      controls.target.set(tx, ty, tz);
      controls.update();
      setOrbitEnabled(!isOpen);
      return;
    }

    // Orbiting is locked out for the whole transition, in both directions —
    // re-enabled at the end only if we've landed back on the closed view.
    setOrbitEnabled(false);

    const proxy = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      tx: controls.target.x,
      ty: controls.target.y,
      tz: controls.target.z,
    };
    gsap.to(proxy, {
      x: px,
      y: py,
      z: pz,
      tx,
      ty,
      tz,
      duration: TRANSITION_DURATION,
      ease: "power2.inOut",
      onUpdate: () => {
        camera.position.set(proxy.x, proxy.y, proxy.z);
        controls.target.set(proxy.tx, proxy.ty, proxy.tz);
        controls.update();
      },
      onComplete: () => {
        if (!isOpen) setOrbitEnabled(true);
      },
    });

    return () => {
      gsap.killTweensOf(proxy);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return null;
}
