import { useMemo } from "react";
import * as THREE from "three";
import { makeLetterTileTexture } from "../../utils/textures";

interface TitleTilesProps {
  word?: string;
  position?: [number, number, number];
  width?: number;
}

/** "memories" spelled out as ransom-note cut-out letter tiles glued to the cover. */
export default function TitleTiles({ word = "memories", position = [0, 0, 0], width = 0.85 }: TitleTilesProps) {
  const letters = useMemo(() => {
    const chars = word.split("");
    const tileSize = width / chars.length;
    return chars.map((char, i) => {
      const map = makeLetterTileTexture(char, i);
      const seed = (i * 53) % 97;
      const jitterY = (Math.sin(seed) * 0.5) * tileSize * 0.35;
      const jitterRot = (Math.cos(seed * 1.7) * 0.5) * 0.22;
      const jitterScale = 0.92 + ((seed % 10) / 10) * 0.22;
      const x = -width / 2 + tileSize * (i + 0.5);
      return { map, x, y: jitterY, rot: jitterRot, s: tileSize * jitterScale };
    });
  }, [word, width]);

  return (
    <group position={position}>
      {letters.map((l, i) => (
        <mesh key={i} position={[l.x, l.y, i * 0.0008]} rotation={[0, 0, l.rot]} castShadow>
          <planeGeometry args={[l.s, l.s]} />
          <meshStandardMaterial map={l.map} transparent roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
