import { useBookStore } from "../../store/useBookStore";

/**
 * Pill CTA shown only over the closed cover — a DOM-level alternative to
 * clicking the 3D cover mesh directly (see Book.tsx/Cover.tsx), positioned
 * to sit just under the book the same way the Wispal reference's "Open the
 * story" button does. Plain React onClick, so it doesn't depend on the
 * in-canvas pointer/drag-vs-click coordination the mesh click does.
 */
export default function CoverCTA() {
  const isOpen = useBookStore((s) => s.isOpen);
  const toggleOpen = useBookStore((s) => s.toggleOpen);

  if (isOpen) return null;

  return (
    <button type="button" className="cover-cta" onClick={() => toggleOpen()}>
      Open <span aria-hidden="true">→</span>
    </button>
  );
}
