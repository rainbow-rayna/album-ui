import { useMemo } from "react";
import { getButtonTexture } from "../../utils/textures";

interface ButtonProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

/** Tiny heart-shaped-collection button stand-in: a cream stitched disc button. */
export default function Button({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 0.035 }: ButtonProps) {
  const map = useMemo(() => getButtonTexture(), []);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 0.18, 24]} />
        <meshStandardMaterial map={map} roughness={0.85} />
      </mesh>
    </group>
  );
}
