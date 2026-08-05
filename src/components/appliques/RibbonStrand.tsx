import { useMemo } from "react";
import * as THREE from "three";
import { getSatinRibbonTextures } from "../../utils/textures";

interface RibbonStrandProps {
  position?: [number, number, number];
  length?: number;
  width?: number;
}

/** A vertical black satin ribbon strand tied along the cover's right edge. */
export default function RibbonStrand({ position = [0, 0, 0], length = 1.3, width = 0.075 }: RibbonStrandProps) {
  const { map, normalMap } = useMemo(() => getSatinRibbonTextures(), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#111114",
        map,
        normalMap,
        roughness: 0.4,
        metalness: 0.05,
        side: THREE.DoubleSide,
      }),
    [map, normalMap]
  );

  return (
    <group position={position}>
      <mesh material={material} castShadow>
        <planeGeometry args={[width, length]} />
      </mesh>
      {/* small knot partway down */}
      <mesh material={material} position={[0, length * 0.12, 0.01]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.05, 0.022, 8, 16]} />
      </mesh>
    </group>
  );
}
