import { create } from "zustand";
import { getTotalPages } from "./useJournalStore";

/**
 * Logical page index is unbounded (0 = cover closed, 1..∞ = pages turned).
 * Only POOL_SIZE actual meshes ever exist — PagePool recycles them by
 * mapping `logicalIndex % POOL_SIZE` to a mesh slot, so the album reads as
 * having an endless supply of pages with no fixed page count.
 */
export const POOL_SIZE = 14;

interface BookState {
  // The last *settled* integer reading position — bookkeeping only. During
  // an active drag/throw/keyboard-nav tween, the live (fractional) position
  // lives in readProgress.ts instead; this only updates once that settles.
  currentPage: number;
  isOpen: boolean;
  isAnimating: boolean;
  // Whether the "new page" composer overlay (upload/chat/generate) is open.
  composerOpen: boolean;
  // Whether the "edit pages" overlay (redo a page's picture / delete a page) is open.
  pagesPanelOpen: boolean;
  setCurrentPage: (page: number) => void;
  toggleOpen: () => void;
  setAnimating: (v: boolean) => void;
  openComposer: () => void;
  closeComposer: () => void;
  openPagesPanel: () => void;
  closePagesPanel: () => void;
}

/** True while a DOM overlay sits over the book, so it shouldn't react to keys/swipes. */
export const isOverlayOpen = () => {
  const { composerOpen, pagesPanelOpen } = useBookStore.getState();
  return composerOpen || pagesPanelOpen;
};

export const useBookStore = create<BookState>((set) => ({
  currentPage: 0,
  isOpen: false,
  isAnimating: false,
  composerOpen: false,
  pagesPanelOpen: false,

  setCurrentPage: (page) => set({ currentPage: Math.max(0, Math.min(getTotalPages(), page)) }),

  // Decoupled from currentPage on purpose: closing the album swings the
  // front cover shut over whatever page you were on, and reopening resumes
  // there — like a real bookmark, rather than resetting to the start.
  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),

  setAnimating: (v) => set({ isAnimating: v }),

  openComposer: () => set({ composerOpen: true }),
  closeComposer: () => set({ composerOpen: false }),
  openPagesPanel: () => set({ pagesPanelOpen: true }),
  closePagesPanel: () => set({ pagesPanelOpen: false }),
}));
