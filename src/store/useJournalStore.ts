import { create } from "zustand";
import type { JournalEntry } from "../journal/types";
import type { LeafFaces } from "../components/Page";
import { fetchAiStatus } from "../journal/ai";
import {
  deleteStoredEntry,
  loadStoredEntries,
  readLegacyEntries,
  requestPersistentStorage,
  saveStoredEntry,
} from "../journal/storage";
import type { AiStatus } from "../../shared/ai";

// Oldest first, so logical page 1 is the earliest memory and new pages are
// always appended at the back of the book.
const byDate = (a: JournalEntry, b: JournalEntry) => a.date.localeCompare(b.date);

interface JournalState {
  entries: JournalEntry[];
  /** False until the pages have been read from storage (IndexedDB is async). */
  entriesLoaded: boolean;
  /**
   * Set when a change couldn't be saved. The change is already on screen, so
   * this has to be shown, not just logged — a silent console warning is how
   * pages used to vanish on the next reload with no explanation.
   */
  saveError: string | null;
  /**
   * Which providers the *server* has keys for. The browser never holds a key —
   * these booleans come from GET /api/ai/status and only decide what the UI
   * says and offers. Starts all-false until the first refresh resolves.
   */
  aiStatus: AiStatus;
  aiStatusLoaded: boolean;
  loadEntries: () => Promise<void>;
  addEntry: (entry: JournalEntry) => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, patch: Partial<Omit<JournalEntry, "id" | "date">>) => void;
  dismissSaveError: () => void;
  refreshAiStatus: () => Promise<void>;
}

export const useJournalStore = create<JournalState>((set, get) => {
  // Changes apply to the screen immediately and are written to storage in
  // the background; if that write fails, say so.
  const save = (write: Promise<void>) =>
    write.catch((err) => {
      console.error("Couldn't save the album", err);
      set({
        saveError: `Couldn't save your last change (${(err as Error)?.message || err}). It will be lost if you reload this page.`,
      });
    });

  return {
    entries: [],
    entriesLoaded: false,
    saveError: null,
    aiStatus: { anthropic: false, gemini: false, openai: false },
    aiStatusLoaded: false,

    refreshAiStatus: async () => {
      const aiStatus = await fetchAiStatus();
      set({ aiStatus, aiStatusLoaded: true });
    },

    loadEntries: async () => {
      try {
        const stored = await loadStoredEntries();
        // Merge rather than replace, in case a page was added before loading finished.
        set((s) => {
          const ids = new Set(stored.map((e) => e.id));
          return { entries: [...stored, ...s.entries.filter((e) => !ids.has(e.id))].sort(byDate), entriesLoaded: true };
        });
        requestPersistentStorage();
      } catch (err) {
        console.error("Couldn't open the album's storage", err);
        // Still show what the old localStorage copy has, but be clear that
        // nothing new will stick.
        set({
          entries: readLegacyEntries().sort(byDate),
          entriesLoaded: true,
          saveError: `Couldn't open the album's storage (${(err as Error)?.message || err}). New pages and edits won't be saved.`,
        });
      }
    },

    addEntry: (entry) => {
      set((s) => ({ entries: [...s.entries, entry].sort(byDate) }));
      void save(saveStoredEntry(entry));
    },

    removeEntry: (id) => {
      set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
      void save(deleteStoredEntry(id));
    },

    // `date` is excluded from the patch so an edit can never re-sort the book.
    updateEntry: (id, patch) => {
      const current = get().entries.find((e) => e.id === id);
      if (!current) return;
      const next = { ...current, ...patch };
      set((s) => ({ entries: s.entries.map((e) => (e.id === id ? next : e)) }));
      void save(saveStoredEntry(next));
    },

    dismissSaveError: () => set({ saveError: null }),
  };
});

void useJournalStore.getState().loadEntries();

// Non-reactive helpers for code outside React render (pageNav.ts, PagePool's
// per-frame loop) — same pattern as readProgress.ts, so the hot path never
// has to subscribe through zustand.
//
// Leaves are packed two content faces at a time — front and back — rather
// than one leaf per face, so consecutive entries share a leaf instead of
// each getting its own blank-padded pair. Leaf 1's front is the book's
// single leading blank spacer; from there every entry's image sits on a
// leaf's back and its text sits on the *next* leaf's front:
//   leaf 1: front = blank            back = image(entry 0)
//   leaf 2: front = text(entry 0)    back = image(entry 1)
//   leaf 3: front = text(entry 1)    back = image(entry 2)
//   ...
//   leaf N+1 (last): front = text(entry N-1)   back = blank (trailing spacer)
// Flipping leaf k lands verso(image k-1) opposite recto(text k-1) — the full
// spread for entry k-1 — and flipping leaf k+1 immediately shows entry k's
// spread right after, with no blank leaf forced in between (the bug this
// packing fixes: the old one-leaf-per-face scheme left both the back of
// every text leaf and the front of the next image leaf permanently blank,
// wasting a full spread between every two entries).
export function getTotalPages(): number {
  const n = useJournalStore.getState().entries.length;
  return n === 0 ? 0 : n + 1;
}

export function getLeafFaces(logicalIndex: number): LeafFaces | null {
  const entries = useJournalStore.getState().entries;
  const n = entries.length;
  if (logicalIndex < 1 || logicalIndex > n + 1) return null;
  const front = logicalIndex === 1 ? null : { entry: entries[logicalIndex - 2], side: "text" as const };
  const back = logicalIndex - 1 < n ? { entry: entries[logicalIndex - 1], side: "image" as const } : null;
  return { front, back };
}
