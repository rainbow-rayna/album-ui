import { useMemo } from "react";
import * as THREE from "three";
import { getSatinRibbonTextures } from "../../utils/textures";

interface RibbonBowProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

function makeTailShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.18, 0);
  s.lineTo(0.18, 0);
  s.lineTo(0.12, -0.55);
  s.lineTo(0, -0.4);
  s.lineTo(-0.12, -0.55);
  s.closePath();
  return s;
}

/** Tied black satin bow with trailing tails, for the cover's upper-left corner. */
export default function RibbonBow({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: RibbonBowProps) {
  const { map, normalMap } = useMemo(() => getSatinRibbonTextures(), []);
  const tailGeo = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(makeTailShape(), { depth: 0.04, bevelEnabled: false, curveSegments: 6 });
    return geo;
  }, []);

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
    <group position={position} rotation={rotation} scale={scale}>
      {/* two loops, facing the camera (torus already lies in the XY plane by
          default) — tilted slightly in Y for a pinched, 3D bow look */}
      <mesh material={material} position={[-0.32, 0.02, 0]} rotation={[0, 0.55, 0.35]} castShadow>
        <torusGeometry args={[0.32, 0.1, 10, 24, Math.PI * 1.5]} />
      </mesh>
      <mesh material={material} position={[0.32, 0.02, 0]} rotation={[0, -0.55, -0.35]} castShadow>
        <torusGeometry args={[0.32, 0.1, 10, 24, Math.PI * 1.5]} />
      </mesh>
      {/* center knot */}
      <mesh material={material} position={[0, 0, 0.05]} castShadow>
        <boxGeometry args={[0.22, 0.18, 0.12]} />
      </mesh>
      {/* trailing tails */}
      <mesh geometry={tailGeo} material={material} position={[-0.1, -0.12, 0.02]} rotation={[0, 0, -0.15]} castShadow />
      <mesh geometry={tailGeo} material={material} position={[0.14, -0.12, -0.01]} rotation={[0, 0, 0.12]} castShadow />
    </group>
  );
}
