import { forwardRef, useImperativeHandle, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { buildPageGeometry, buildBoneChain, PAGE_WIDTH, PAGE_HEIGHT, FACE_OFFSET } from "../utils/pageBend";
import { getDeckleEdgeAlpha, getPagePaperTextures } from "../utils/textures";
import { getEntryImageTexture, getEntryTextTexture } from "../journal/pageTexture";
import type { JournalEntry } from "../journal/types";

/**
 * A single page. Geometry/skeleton follow the bone-chain bend technique
 * described in pageBend.ts.
 *
 * The leaf is built from TWO separate meshes — one for the front (recto),
 * one for the back (verso) — each a full copy of the bent box geometry,
 * each with its own single material, offset ±FACE_OFFSET (pageBend.ts)
 * apart in Z so they never occupy the same physical space. See
 * pageBend.ts's MIN_DEPTH_SEPARATION comment for why that offset has to be
 * so much larger than the page's own visual thickness.
 *
 * Each leaf carries two independent faces — front (recto) and back (verso)
 * — which, past the very first leaf, belong to two different entries: a
 * leaf's front is the previous entry's journal text, its back is the next
 * entry's image (see useJournalStore's getLeafFaces for the full packing
 * scheme and why). Flipping one leaf therefore lands the *next* entry's
 * full image+text spread immediately, with no blank leaf forced in
 * between. Either face can be null (blank kraft paper) — true only for the
 * book's leading spacer (leaf 1's front) and trailing spacer (the last
 * leaf's back).
 *
 * Content is pushed in imperatively via the handle's `setContent`, the same
 * way PagePool already drives transforms — these meshes are recycled
 * across many logical pages over their lifetime, so content has to be able
 * to change without a React re-render.
 */

export type LeafSide = "image" | "text";

export interface FaceContent {
  entry: JournalEntry;
  side: LeafSide;
}

export interface LeafFaces {
  front: FaceContent | null;
  back: FaceContent | null;
}

export interface PageHandle {
  group: THREE.Group;
  bones: THREE.Bone[];
  setContent: (content: LeafFaces | null) => void;
}

const sharedGeometry = buildPageGeometry();

interface PageProps {
  onPointerDown?: () => void;
}

const Page = forwardRef<PageHandle, PageProps>(function Page({ onPointerDown }, ref) {
  const groupRef = useRef<THREE.Group>(null!);
  const frontMeshRef = useRef<THREE.SkinnedMesh>(null!);
  const backMeshRef = useRef<THREE.SkinnedMesh>(null!);
  const { bones: frontBones, skeleton: frontSkeleton } = useMemo(() => buildBoneChain(), []);
  const { bones: backBones, skeleton: backSkeleton } = useMemo(() => buildBoneChain(), []);
  // Tracked per-face, not per-leaf — front and back now belong to two
  // different entries (or one/both can be blank), so a stale async texture
  // load on one face must not be gated by the other face's key.
  const currentFrontKeyRef = useRef<string | null>(null);
  const currentBackKeyRef = useRef<string | null>(null);

  const paperTexturesRef = useRef(getPagePaperTextures());

  // Blank faces use the book's own grained/mottled paper texture (with its
  // normal map), not a flat solid fill — a perfectly flat color has no
  // texture detail to break up ordinary light falloff across the page, so
  // what's just an unremarkable lighting gradient elsewhere in the scene
  // reads as a hard, suspicious-looking seam on a page that's supposed to
  // be blank.
  function makeFaceMaterial() {
    const { map, normalMap } = paperTexturesRef.current;
    return new THREE.MeshStandardMaterial({
      map,
      normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
      color: new THREE.Color("#fbf6e8"),
      roughness: 0.94,
      metalness: 0,
    });
  }

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

  function buildFaceMesh(bones: THREE.Bone[], skeleton: THREE.Skeleton, zOffset: number, ref: MutableRefObject<THREE.SkinnedMesh>) {
    const mesh = new THREE.SkinnedMesh(sharedGeometry, makeFaceMaterial());
    mesh.position.z = zOffset;
    mesh.add(bones[0]);
    mesh.bind(skeleton);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    ref.current = mesh;
    return mesh;
  }

  const frontMesh = useMemo(
    () => buildFaceMesh(frontBones, frontSkeleton, FACE_OFFSET, frontMeshRef),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frontBones, frontSkeleton]
  );
  const backMesh = useMemo(
    () => buildFaceMesh(backBones, backSkeleton, -FACE_OFFSET, backMeshRef),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [backBones, backSkeleton]
  );

  function resetFace(mesh: THREE.SkinnedMesh) {
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const { map, normalMap } = paperTexturesRef.current;
    mat.map = map;
    mat.normalMap = normalMap;
    mat.color.set("#fbf6e8");
    mat.needsUpdate = true;
  }

  function setFace(mesh: THREE.SkinnedMesh, tex: THREE.Texture) {
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.map = tex;
    mat.normalMap = null;
    mat.color.set("#ffffff");
    mat.needsUpdate = true;
  }

  function applyFace(
    meshRef: MutableRefObject<THREE.SkinnedMesh>,
    face: FaceContent | null,
    keyRef: MutableRefObject<string | null>
  ) {
    const key = face ? face.entry.id + ":" + face.side : null;
    keyRef.current = key;
    if (!face) {
      resetFace(meshRef.current);
      return;
    }
    const getTexture = face.side === "image" ? getEntryImageTexture : getEntryTextTexture;
    const tex = getTexture(face.entry, (loaded) => {
      if (keyRef.current !== key) return;
      setFace(meshRef.current, loaded);
    });
    if (tex) setFace(meshRef.current, tex);
    else resetFace(meshRef.current); // placeholder while the real texture loads
  }

  useImperativeHandle(ref, () => ({
    group: groupRef.current,
    // Both face meshes bend identically (same bone-chain math, same drive
    // from PagePool), so either's bone list works as "the" bones for
    // callers that just need to read/flex the page shape.
    bones: frontBones,
    setContent(content: LeafFaces | null) {
      applyFace(frontMeshRef, content?.front ?? null, currentFrontKeyRef);
      applyFace(backMeshRef, content?.back ?? null, currentBackKeyRef);
    },
  }));

  return (
    <group ref={groupRef} onPointerDown={onPointerDown}>
      <primitive object={frontMesh} />
      <primitive object={backMesh} />
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
