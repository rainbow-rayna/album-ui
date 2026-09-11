import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getKraftPaperTextures } from "../utils/textures";
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  FRONT_COVER_OPEN_ANGLE,
  CLOSED_ANGLE,
  BACK_COVER_OPEN_ANGLE,
  FRONT_COVER_Z,
  getFrontCoverOpenZ,
  getBackCoverZ,
} from "../utils/pageBend";
import { useBookStore } from "../store/useBookStore";
import { getTotalPages } from "../store/useJournalStore";
import { pendingClick } from "../utils/dragCoordinator";
import RibbonBow from "./appliques/RibbonBow";
import RibbonStrand from "./appliques/RibbonStrand";
import Heart from "./appliques/Heart";
import Star from "./appliques/Star";
import Button from "./appliques/Button";
import TitleTiles from "./appliques/TitleTiles";
import AdvisorySticker from "./appliques/AdvisorySticker";

export const COVER_WIDTH = PAGE_WIDTH + 0.05;
export const COVER_HEIGHT = PAGE_HEIGHT + 0.05;
export const COVER_DEPTH = 0.03;

export interface CoverHandle {
  group: THREE.Group;
}

interface CoverProps {
  variant: "front" | "back";
}

const Cover = forwardRef<CoverHandle, CoverProps>(function Cover({ variant }, ref) {
  const groupRef = useRef<THREE.Group>(null!);

  useImperativeHandle(ref, () => ({ group: groupRef.current }));

  const geometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(COVER_WIDTH, COVER_HEIGHT, COVER_DEPTH, 1, 1, 1);
    geo.translate(COVER_WIDTH / 2, 0, 0);
    return geo;
  }, []);

  const material = useMemo(() => {
    const { map, normalMap, roughnessMap } = getKraftPaperTextures();
    return new THREE.MeshStandardMaterial({
      map,
      normalMap,
      roughnessMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
      color: "#ffffff",
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
    });
  }, []);

  const isFront = variant === "front";

  // The front cover is a rigid, one-time hardcover flip — fully decoupled
  // from PagePool's hinge/fan math and from reading progress. It rotates a
  // fixed 180° to lie flat, face-down, sinking to a buried Z (deeper than
  // any page depth the pool currently renders) so it becomes the permanent
  // bottom-most layer of the read stack once open — it was "opened" first,
  // so it stays there for good, no matter how many pages get turned
  // afterward. The back cover mirrors this: it swings open the opposite
  // rotational direction, to BACK_COVER_OPEN_ANGLE (+1°, vs. the front's
  // -180°) — two hardcovers opening away from each other, like double
  // doors — but just barely, ending up slightly ajar rather than lying
  // flat. Both covers' Z track getBackCoverZ/getFrontCoverOpenZ (not a
  // fixed constant) since how far back they need to sit depends on how
  // many pages currently exist — a short book's covers stay much closer
  // together than a long one's.
  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const isOpen = useBookStore.getState().isOpen;
    const totalPages = getTotalPages();
    const targetRotY = isFront
      ? isOpen
        ? FRONT_COVER_OPEN_ANGLE
        : CLOSED_ANGLE
      : isOpen
        ? BACK_COVER_OPEN_ANGLE
        : CLOSED_ANGLE;
    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY, 4, dt);
    const targetZ = isFront ? (isOpen ? getFrontCoverOpenZ(totalPages) : FRONT_COVER_Z) : getBackCoverZ(totalPages);
    groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, targetZ, 4, dt);
  });

  return (
    <group
      ref={groupRef}
      position={[0, 0, isFront ? FRONT_COVER_Z : getBackCoverZ(getTotalPages())]}
      onPointerDown={
        isFront
          ? () => {
              // Clicking the cover only ever opens it — closing is a
              // left-to-right swipe (see Book.tsx) so a raycast that hits
              // this cover behind a page (pages are paper-thin) can't
              // mistakenly close the album out from under the reader.
              pendingClick.action = () => {
                if (!useBookStore.getState().isOpen) useBookStore.getState().toggleOpen();
              };
            }
          : undefined
      }
    >
      <mesh geometry={geometry} material={material} castShadow receiveShadow frustumCulled={false} />

      {isFront && (
        <group position={[0, 0, COVER_DEPTH / 2 + 0.002]}>
          <TitleTiles position={[COVER_WIDTH * 0.52, COVER_HEIGHT * 0.04, 0]} width={COVER_WIDTH * 0.72} />

          <RibbonBow position={[COVER_WIDTH * 0.18, COVER_HEIGHT * 0.36, 0.01]} rotation={[0, 0, 0.1]} scale={0.11} />
          <RibbonStrand position={[COVER_WIDTH * 0.9, 0, 0.005]} length={COVER_HEIGHT * 0.72} width={0.045} />

          <Heart position={[COVER_WIDTH * 0.8, COVER_HEIGHT * 0.3, 0.015]} rotation={[0, 0, 0.35]} scale={0.075} />
          <Heart position={[COVER_WIDTH * 0.24, COVER_HEIGHT * -0.32, 0.015]} rotation={[0, 0, -0.5]} scale={0.06} color="#b5202f" />

          <Star position={[COVER_WIDTH * 0.68, COVER_HEIGHT * 0.4, 0.012]} scale={0.045} color="#e8dcb8" />
          <Star position={[COVER_WIDTH * 0.9, COVER_HEIGHT * 0.18, 0.012]} scale={0.035} color="#c72c3b" outline="#f4e9d0" />
          <Star position={[COVER_WIDTH * 0.14, COVER_HEIGHT * -0.18, 0.012]} scale={0.04} color="#e8dcb8" />
          <Star position={[COVER_WIDTH * 0.36, COVER_HEIGHT * -0.42, 0.012]} scale={0.032} color="#c72c3b" outline="#f4e9d0" />
          <Star position={[COVER_WIDTH * 0.15, COVER_HEIGHT * -0.42, 0.012]} scale={0.03} color="#e8dcb8" />

          <Button position={[COVER_WIDTH * 0.72, COVER_HEIGHT * 0.2, 0.014]} rotation={[0, 0, 0.2]} />
          <Button position={[COVER_WIDTH * 0.86, COVER_HEIGHT * 0.32, 0.014]} rotation={[0, 0, -0.3]} />
          <Button position={[COVER_WIDTH * 0.16, COVER_HEIGHT * -0.4, 0.014]} rotation={[0, 0, 0.4]} />
          <Button position={[COVER_WIDTH * 0.35, COVER_HEIGHT * -0.22, 0.014]} rotation={[0, 0, -0.1]} />

          <AdvisorySticker position={[COVER_WIDTH * 0.84, COVER_HEIGHT * -0.42, 0.013]} rotation={-0.09} scale={0.11} />
        </group>
      )}
    </group>
  );
});

export default Cover;
