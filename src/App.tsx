import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Suspense } from "react";
import Experience from "./components/Experience";

export default function App() {
  return (
    <>
      <Canvas shadows gl={{ antialias: true, toneMappingExposure: 1.3 }}>
        <color attach="background" args={["#0a0a0c"]} />
        <fog attach="fog" args={["#0a0a0c", 6, 20]} />
        {/* Off-axis start position (rather than dead-on) so the closed
            page-stack depth reads immediately — OrbitControls (in
            Experience) takes over look-at and orbiting from here. */}
        <PerspectiveCamera makeDefault position={[1.7, 0.6, 3.8]} fov={30} near={0.1} far={50} />
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>
      <div className="hint">
        drag to orbit · click cover to open · click a page (right to advance, left to go back) or ← → arrow keys to
        flip · drag left to right to close
      </div>
    </>
  );
}
