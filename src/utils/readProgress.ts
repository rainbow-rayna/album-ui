/**
 * Continuous, non-reactive reading position: 0 (nothing read) to
 * TOTAL_PAGES (everything read), fractional while a page is mid-flip.
 * Eased toward its target by pageNav.ts's navigateTo whenever a page click
 * or arrow key fires, and read every frame by PagePool — kept outside
 * zustand so per-frame tween updates never trigger a React re-render. The
 * store's `currentPage` is only the last *settled* integer, for bookkeeping
 * (e.g. clamping at the ends) — this is the source of truth for rendering.
 */
export const readProgress = { current: 0 };
