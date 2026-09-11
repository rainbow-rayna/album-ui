import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Vignette, Bloom } from "@react-three/postprocessing";
import Book from "./Book";
import Particles from "./Particles";
import CameraRig from "./CameraRig";
import { useBookStore } from "../store/useBookStore";

// Closed: a single warm lamp above-front of the propped-up book, close
// enough that its shadow gives the cover some depth.
const CLOSED_SPOT_POS: [number, number, number] = [1.1, 3.4, 2.6];
const CLOSED_SPOT_TARGET: [number, number, number] = [0, -0.1, 0];
// Open: moved out to the fan's own center (same target CameraRig frames)
// and pulled back roughly along the camera's own sightline instead of
// grazing in from one side — a wide fan of near-vertical pages catches a
// side light very unevenly (some faces lit, their neighbors shadowed), the
// way a flash mounted near the viewing angle doesn't.
const OPEN_SPOT_POS: [number, number, number] = [-2.6, 4.2, 4.6];
const OPEN_SPOT_TARGET: [number, number, number] = [-1.2, 0.1, 0.58];
// The spotlight's cone is aimed at that same center but is still a cone —
// its far edges (where the fan's two bookend covers sit) can fall closer to
// the penumbra falloff than the middle pages do. A plain point light with
// no falloff shape to miss, centered on the fan instead of the closed book,
// keeps both covers reading as the same warm, lit material as the pages
// between them rather than one end looking dim.
const CLOSED_FILL_POS: [number, number, number] = [0, 0.2, 2.5];
const OPEN_FILL_POS: [number, number, number] = [-1.2, 1.2, 0.9];

/**
 * Calm, private lighting: one warm spotlight from above-front (like a single
 * lamp in a quiet room), a low cool fill so shadows don't go fully black,
 * and a soft vignette so the eye stays on the album floating in the dark.
 */
export default function Experience() {
  const targetRef = useRef<THREE.Object3D>(null!);
  const spotRef = useRef<THREE.SpotLight>(null!);
  const fillRef = useRef<THREE.PointLight>(null!);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const [orbitEnabled, setOrbitEnabled] = useState(true);

  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
    }
  }, []);

  // The open fan sits off to one side of the closed book's position, so the
  // lamp has to follow it there — and, since reading should never show a
  // page shadowed by its neighbor, the lamp stops casting shadows at all
  // once open (the closed cover keeps its shadow; it's a single flat plane,
  // so it never self-shadows anyway).
  useFrame((_, dt) => {
    if (!spotRef.current || !targetRef.current) return;
    const isOpen = useBookStore.getState().isOpen;
    const [px, py, pz] = isOpen ? OPEN_SPOT_POS : CLOSED_SPOT_POS;
    const [tx, ty, tz] = isOpen ? OPEN_SPOT_TARGET : CLOSED_SPOT_TARGET;
    spotRef.current.position.x = THREE.MathUtils.damp(spotRef.current.position.x, px, 4, dt);
    spotRef.current.position.y = THREE.MathUtils.damp(spotRef.current.position.y, py, 4, dt);
    spotRef.current.position.z = THREE.MathUtils.damp(spotRef.current.position.z, pz, 4, dt);
    targetRef.current.position.x = THREE.MathUtils.damp(targetRef.current.position.x, tx, 4, dt);
    targetRef.current.position.y = THREE.MathUtils.damp(targetRef.current.position.y, ty, 4, dt);
    targetRef.current.position.z = THREE.MathUtils.damp(targetRef.current.position.z, tz, 4, dt);
    spotRef.current.castShadow = !isOpen;

    if (fillRef.current) {
      const [fx, fy, fz] = isOpen ? OPEN_FILL_POS : CLOSED_FILL_POS;
      fillRef.current.position.x = THREE.MathUtils.damp(fillRef.current.position.x, fx, 4, dt);
      fillRef.current.position.y = THREE.MathUtils.damp(fillRef.current.position.y, fy, 4, dt);
      fillRef.current.position.z = THREE.MathUtils.damp(fillRef.current.position.z, fz, 4, dt);
    }
  });

  return (
    <>
      <ambientLight intensity={0.28} color="#3a4050" />
      <hemisphereLight args={["#4a5070", "#0a0a0c", 0.35]} />

      <object3D ref={targetRef} position={CLOSED_SPOT_TARGET} />
      <spotLight
        ref={spotRef}
        position={CLOSED_SPOT_POS}
        angle={0.55}
        penumbra={0.8}
        intensity={9}
        color="#ffdcae"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      />
      <pointLight position={[-1.5, 0.5, -1.5]} intensity={0.5} color="#5a6aa0" />
      <pointLight ref={fillRef} position={CLOSED_FILL_POS} intensity={0.9} color="#fff0d8" decay={0.6} />

      <Book />
      <Particles />

      {/* The album itself never rotates — dragging orbits the camera around
          it instead, like a static object viewed in a 3D viewport. Orbiting
          is only available while closed; CameraRig locks it once the album
          opens and reframes to a comfortable "reading on a book stand" angle.
          No `target` prop here on purpose — CameraRig owns it imperatively
          via the ref, since a fresh array literal every render would
          otherwise fight that. */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={orbitEnabled}
        enableZoom={false}
        enablePan={false}
        enableDamping={false}
        minPolarAngle={THREE.MathUtils.degToRad(15)}
        maxPolarAngle={THREE.MathUtils.degToRad(140)}
      />
      <CameraRig controlsRef={controlsRef} setOrbitEnabled={setOrbitEnabled} />

      {/* mipmapBlur removed: its mip-chain sampling was blending each page's
          rendered content into its neighbors' screen-space regions — most
          visible as another page's imagery bleeding into an adjacent blank
          page. The standard (non-mip) blur kernel below doesn't sample
          across regions that far, so it doesn't have this cross-talk. */}
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.2} luminanceThreshold={0.75} luminanceSmoothing={0.3} />
        <Vignette eskil={false} offset={0.2} darkness={0.55} />
      </EffectComposer>
    </>
  );
}
