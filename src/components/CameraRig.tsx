import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useBookStore } from "../store/useBookStore";

// Must match the PerspectiveCamera's initial position/target in App.tsx —
// this is where the closed, orbit-able "propped on a stand" view lives.
const DEFAULT_CAMERA_POS: [number, number, number] = [1.7, 0.6, 3.8];
const DEFAULT_TARGET: [number, number, number] = [0, 0.05, 0];

// Eye-level (~20° elevation, not looking down from above), azimuth aligned
// with the fan's angle at the start of the book (FRONT_OPEN_ANGLE, -30°) so
// the freshly-opened spread reads face-on rather than edge-on — pages later
// in the book (whose resting angle drifts toward BACK_COVER_ANGLE) will be
// more oblique from this fixed angle, which is an accepted trade-off of a
// static eye-level camera against this wide (150°) fan. Target is still the
// fan's bounding-box center so the whole spread stays in frame uncropped.
// Distance was solved analytically (project the fan's 6 bounding corners
// into camera space along this same viewing direction and take the
// smallest distance that keeps every corner inside the 30° vertical FOV at
// a 1280x800 aspect, plus a small margin) rather than pulled back further
// "to be safe" — that's what previously made opening read as zooming out
// to a tiny, far-away book instead of a much gentler shift from the closed
// framing.
const OPEN_CAMERA_POS: [number, number, number] = [-4.02, 2.15, 5.46];
const OPEN_TARGET: [number, number, number] = [-1.2, 0.1, 0.58];

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
