import { create } from "zustand";

/**
 * Logical page index is unbounded (0 = cover closed, 1..∞ = pages turned).
 * Only POOL_SIZE actual meshes ever exist — PagePool recycles them by
 * mapping `logicalIndex % POOL_SIZE` to a mesh slot, so the album reads as
 * having an endless supply of blank pages with no fixed page count.
 */
export const POOL_SIZE = 14;

/**
 * Finite "leaf" count so the back cover is a real, reachable endpoint (the
 * whole fan spans exactly 180° from opened-front-cover to back-cover — see
 * pageBend.ts). The mesh pool above still only ever mounts POOL_SIZE meshes,
 * recycling them across this range, so raising this number costs nothing at
 * render time. Swap for a real content array's length once pages hold data.
 */
export const TOTAL_PAGES = 48;

interface BookState {
  // The last *settled* integer reading position — bookkeeping only. During
  // an active drag/throw/keyboard-nav tween, the live (fractional) position
  // lives in readProgress.ts instead; this only updates once that settles.
  currentPage: number;
  isOpen: boolean;
  isAnimating: boolean;
  setCurrentPage: (page: number) => void;
  toggleOpen: () => void;
  setAnimating: (v: boolean) => void;
}

export const useBookStore = create<BookState>((set) => ({
  currentPage: 0,
  isOpen: false,
  isAnimating: false,

  setCurrentPage: (page) => set({ currentPage: Math.max(0, Math.min(TOTAL_PAGES, page)) }),

  // Decoupled from currentPage on purpose: closing the album swings the
  // front cover shut over whatever page you were on, and reopening resumes
  // there — like a real bookmark, rather than resetting to the start.
  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),

  setAnimating: (v) => set({ isAnimating: v }),
}));
