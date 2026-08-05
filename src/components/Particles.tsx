import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 140;

function makeSpriteTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,244,222,0.9)");
  grad.addColorStop(0.4, "rgba(255,230,190,0.35)");
  grad.addColorStop(1, "rgba(255,230,190,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Faint drifting dust motes / bokeh, kept subtle so the album stays the focus. */
export default function Particles() {
  const pointsRef = useRef<THREE.Points>(null!);
  const sprite = useMemo(() => makeSpriteTexture(), []);

  const { positions, phases, speeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const phases = new Float32Array(COUNT);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.05 + Math.random() * 0.08;
    }
    return { positions, phases, speeds };
  }, []);

  const basePositions = useMemo(() => positions.slice(), [positions]);

  useFrame((_, dt) => {
    const geo = pointsRef.current.geometry;
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    const t = performance.now() / 1000;
    for (let i = 0; i < COUNT; i++) {
      const phase = phases[i] + t * speeds[i];
      const bx = basePositions[i * 3];
      const by = basePositions[i * 3 + 1];
      const bz = basePositions[i * 3 + 2];
      attr.setXYZ(i, bx + Math.sin(phase) * 0.3, by + Math.sin(phase * 0.7) * 0.15 + t * 0.02 * speeds[i] * 10, bz + Math.cos(phase * 0.5) * 0.2);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        size={0.09}
        transparent
        opacity={0.28}
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
