import { useMemo } from "react";
import * as THREE from "three";

interface StarProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  color?: string;
  outline?: string;
}

function makeStarShape(points: number, outerR: number, innerR: number): THREE.Shape {
  const shape = new THREE.Shape();
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = i * step - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/** Small flat outlined star, scattered around the hearts. */
export default function Star({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 0.05, color = "#e6c9a3", outline = "#1a1a1a" }: StarProps) {
  const { fill, outlineGeo } = useMemo(() => {
    const shape = makeStarShape(5, 1, 0.42);
    const fillGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false, curveSegments: 8 });
    fillGeo.center();
    const outerShape = makeStarShape(5, 1.14, 0.48);
    const outlineGeo = new THREE.ExtrudeGeometry(outerShape, { depth: 0.05, bevelEnabled: false, curveSegments: 8 });
    outlineGeo.center();
    return { fill: fillGeo, outlineGeo };
  }, []);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={outlineGeo} position={[0, 0, -0.01]}>
        <meshStandardMaterial color={outline} roughness={0.9} />
      </mesh>
      <mesh geometry={fill} castShadow>
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.05} />
      </mesh>
    </group>
  );
}
