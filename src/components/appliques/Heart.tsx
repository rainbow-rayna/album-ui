import { useMemo } from "react";
import * as THREE from "three";

interface HeartProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  color?: string;
}

function makeHeartShape(): THREE.Shape {
  const shape = new THREE.Shape();
  const x = 0;
  const y = 0;
  shape.moveTo(x, y + 0.25);
  shape.bezierCurveTo(x, y + 0.25, x - 0.5, y - 0.2, x - 1, y + 0.25);
  shape.bezierCurveTo(x - 1.6, y + 0.85, x - 0.9, y + 1.3, x, y + 0.55);
  shape.bezierCurveTo(x + 0.9, y + 1.3, x + 1.6, y + 0.85, x + 1, y + 0.25);
  shape.bezierCurveTo(x + 0.5, y - 0.2, x, y + 0.25, x, y + 0.25);
  return shape;
}

/** A puffy, fabric-look heart appliqué (extruded + beveled to read as glued-on felt). */
export default function Heart({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 0.08, color = "#c72c3b" }: HeartProps) {
  const geometry = useMemo(() => {
    const shape = makeHeartShape();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.35,
      bevelSize: 0.25,
      bevelSegments: 6,
      curveSegments: 16,
    });
    geo.center();
    return geo;
  }, []);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={color}
          roughness={0.75}
          sheen={1}
          sheenRoughness={0.6}
          sheenColor={"#ff9aa2"}
          clearcoat={0.05}
        />
      </mesh>
    </group>
  );
}
