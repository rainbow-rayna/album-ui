import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Suspense } from "react";
import Experience from "./components/Experience";
import TopBar from "./components/ui/TopBar";
import CoverCTA from "./components/ui/CoverCTA";
import PageNavBar from "./components/ui/PageNavBar";
import PageActions from "./components/ui/PageActions";
import { Composer } from "./components/ui/Composer";
import { PagesPanel } from "./components/ui/PagesPanel";
import SaveErrorBanner from "./components/ui/SaveErrorBanner";

export default function App() {
  return (
    <>
      <Canvas shadows gl={{ antialias: true, toneMappingExposure: 1.3 }}>
        <color attach="background" args={["#0a0a0c"]} />
        <fog attach="fog" args={["#0a0a0c", 6, 20]} />
        {/* Off-axis start position (rather than dead-on) so the closed
            page-stack depth reads immediately — OrbitControls (in
            Experience) takes over look-at and orbiting from here.
            near/far kept tight (nothing in this scene is ever closer than
            ~2 units or farther than the fog's own 20-unit falloff) — a
            wide near/far ratio starves the depth buffer of precision at
            the book's actual distance, which was letting adjacent stacked
            pages z-fight with each other despite real physical spacing. */}
        <PerspectiveCamera makeDefault position={[1.7, 0.6, 3.8]} fov={30} near={0.5} far={20} />
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>
      <TopBar />
      <CoverCTA />
      <PageNavBar />
      <PageActions />
      <Composer />
      <PagesPanel />
      <SaveErrorBanner />
    </>
  );
}
