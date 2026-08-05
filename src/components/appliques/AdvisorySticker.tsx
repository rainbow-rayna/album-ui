import { useMemo } from "react";
import { getAdvisoryStickerTexture } from "../../utils/textures";

interface AdvisoryStickerProps {
  position?: [number, number, number];
  rotation?: number;
  scale?: number;
}

/**
 * Stylized "Parental Advisory — Explicit Content" style sticker. This is a
 * generic look-alike label, not a reproduction of the official RIAA mark.
 */
export default function AdvisorySticker({ position = [0, 0, 0], rotation = -0.08, scale = 0.16 }: AdvisoryStickerProps) {
  const map = useMemo(() => getAdvisoryStickerTexture(), []);

  return (
    <mesh position={position} rotation={[0, 0, rotation]} scale={[scale * 1.7, scale, 1]} castShadow>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial map={map} roughness={0.6} />
    </mesh>
  );
}
