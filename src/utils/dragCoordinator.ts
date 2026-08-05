export interface PendingClick {
  action: (() => void) | null;
}

/**
 * Shared, non-reactive coordination between Book.tsx (which owns the actual
 * pointer/drag tracking and decides drag-vs-click) and whichever mesh was
 * pressed (a cover or a page). Each interactive mesh's onPointerDown sets
 * `pendingClick.action` to whatever it should do on a plain click; Book's
 * shared pointerup handler invokes it only if the pointer never actually
 * dragged, then always clears it so a stale action can't leak into the next
 * press.
 */
export const pendingClick: PendingClick = { action: null };
