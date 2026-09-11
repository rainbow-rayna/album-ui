import { useMemo, useRef, useLayoutEffect } from "react";
import * as THREE from "three";
import { getGoldCoilTextures } from "../../utils/textures";

interface SpiralBindingProps {
  height: number;
  x: number;
  coils?: number;
  // How far each ring's loop reaches from its center, in Z — i.e. half the
  // total front-cover-to-back-cover depth it needs to visually bridge.
  // Defaults to a plausible closed-notebook thickness; Book.tsx passes in
  // the real front/back cover gap so the coil actually reaches both
  // covers instead of assuming a fixed book thickness.
  depthRadius?: number;
  // How far each ring extends sideways, in X — i.e. how much of the open
  // page it visually overlaps near the spine. Kept independent of
  // depthRadius (each ring is scaled into an ellipse, not a plain circle):
  // a torus's single radius otherwise controls both at once, so widening
  // the coil to reach a farther-back cover would just as directly widen how
  // far it reaches across the page, covering page content near the spine
  // that has no reason to know how deep the book's cover happens to sit.
  xRadius?: number;
}

/** Gold-toned metal spiral coil running along the album's left (spine) edge. */
export default function SpiralBinding({ height, x, coils = 26, depthRadius = 0.055, xRadius = 0.03 }: SpiralBindingProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const { map, roughnessMap } = useMemo(() => getGoldCoilTextures(), []);
  // Each ring's local plane (before the X-axis rotation below) has X mapping
  // straight through to world X (unaffected by a rotation around X) and Y
  // mapping to world Z — so scaling local X is how the ring's world-X reach
  // is squeezed down independent of the torus's own radius (which the ring's
  // world-Z reach otherwise uses unscaled).
  const xScale = xRadius / depthRadius;

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const spacing = height / coils;
    for (let i = 0; i < coils; i++) {
      const y = height / 2 - spacing * i - spacing / 2;
      dummy.position.set(x, y, 0);
      dummy.rotation.set(Math.PI / 2, 0.15, 0);
      dummy.scale.set(xScale, 1, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [coils, height, x, xScale]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, coils]} castShadow receiveShadow>
      <torusGeometry args={[depthRadius, 0.012, 8, 16, Math.PI * 1.7]} />
      <meshStandardMaterial map={map} roughnessMap={roughnessMap} metalness={0.9} roughness={0.35} />
    </instancedMesh>
  );
}
