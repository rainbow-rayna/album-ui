import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildPageGeometry, buildBoneChain, PAGE_WIDTH, PAGE_HEIGHT } from "../utils/pageBend";
import { getPagePaperTextures, getDeckleEdgeAlpha } from "../utils/textures";

/**
 * A single blank page. Geometry/skeleton follow the bone-chain bend
 * technique described in pageBend.ts. Content is intentionally data-driven
 * and empty for now (see `content` prop) so a future photo/decoration swap
 * only needs to change what's drawn on the material, not the geometry,
 * skinning, or flip logic.
 */

export interface PageContent {
  // Placeholder for future data-driven content (photo, caption, decoration).
  // Every page is blank today, but PagePool already threads this through.
  kind: "blank";
}

export interface PageHandle {
  group: THREE.Group;
  bones: THREE.Bone[];
}

const sharedGeometry = buildPageGeometry();

interface PageProps {
  content?: PageContent;
  onPointerDown?: () => void;
}

const Page = forwardRef<PageHandle, PageProps>(function Page({ onPointerDown }, ref) {
  const groupRef = useRef<THREE.Group>(null!);
  const { bones, skeleton } = useMemo(() => buildBoneChain(), []);

  const material = useMemo(() => {
    const { map, normalMap } = getPagePaperTextures();
    return new THREE.MeshStandardMaterial({
      map,
      normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
      color: new THREE.Color("#fbf6e8"),
      roughness: 0.94,
      metalness: 0,
      side: THREE.DoubleSide,
    });
  }, []);

  const edgeMaterial = useMemo(() => {
    const deckle = getDeckleEdgeAlpha();
    const tex = deckle.clone();
    tex.needsUpdate = true;
    tex.rotation = Math.PI / 2;
    tex.center.set(0.5, 0.5);
    tex.repeat.set(1, 1);
    return new THREE.MeshStandardMaterial({
      color: "#efe6d0",
      alphaMap: tex,
      transparent: true,
      roughness: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, []);

  const skinnedMesh = useMemo(() => {
    const mesh = new THREE.SkinnedMesh(sharedGeometry, material);
    mesh.add(bones[0]);
    mesh.bind(skeleton);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    return mesh;
  }, [material, bones, skeleton]);

  useImperativeHandle(ref, () => ({
    group: groupRef.current,
    bones,
  }));

  return (
    <group ref={groupRef} onPointerDown={onPointerDown}>
      <primitive object={skinnedMesh} />
      {/* faint torn/deckle edge along the outer border, hinting handmade paper */}
      <mesh
        material={edgeMaterial}
        position={[PAGE_WIDTH, 0, 0]}
        rotation={[0, 0, 0]}
      >
        <planeGeometry args={[0.05, PAGE_HEIGHT]} />
      </mesh>
    </group>
  );
});

export default Page;
