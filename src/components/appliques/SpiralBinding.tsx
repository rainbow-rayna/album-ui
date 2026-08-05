import { useMemo, useRef, useLayoutEffect } from "react";
import * as THREE from "three";
import { getGoldCoilTextures } from "../../utils/textures";

interface SpiralBindingProps {
  height: number;
  x: number;
  coils?: number;
}

/** Gold-toned metal spiral coil running along the album's left (spine) edge. */
export default function SpiralBinding({ height, x, coils = 26 }: SpiralBindingProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const { map, roughnessMap } = useMemo(() => getGoldCoilTextures(), []);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const spacing = height / coils;
    for (let i = 0; i < coils; i++) {
      const y = height / 2 - spacing * i - spacing / 2;
      dummy.position.set(x, y, 0);
      dummy.rotation.set(Math.PI / 2, 0.15, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [coils, height, x]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, coils]} castShadow receiveShadow>
      <torusGeometry args={[0.055, 0.012, 8, 16, Math.PI * 1.7]} />
      <meshStandardMaterial map={map} roughnessMap={roughnessMap} metalness={0.9} roughness={0.35} />
    </instancedMesh>
  );
}
