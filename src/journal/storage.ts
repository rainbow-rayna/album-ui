import type { JournalEntry } from "./types";
import { STORAGE_KEY } from "./constants";

/**
 * Where the album's pages live: IndexedDB, one record per page.
 *
 * Pages used to be kept as a single JSON array in localStorage, which Chrome
 * caps at about 5 MB per site. Each AI-drawn page is 1-3 MB, so after three
 * or four pages every new one failed to save — silently: it stayed on screen
 * until the next reload and then vanished. IndexedDB's quota is a share of
 * free disk space (typically gigabytes), and with one record per page a save
 * writes only that page, so two open tabs can't overwrite each other's pages.
 *
 * Pages saved by the localStorage version are copied over once, the first
 * time this runs. The old localStorage copy is left untouched as a backup.
 */

const DB_NAME = "memories-album";
const DB_VERSION = 1;
const ENTRIES = "entries";
const META = "meta";
const MIGRATED_KEY = "migratedFromLocalStorage";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(ENTRIES)) db.createObjectStore(ENTRIES, { keyPath: "id" });
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    // Let a later call try again rather than caching the failure forever.
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

/** Resolves once the transaction has actually committed to disk, not when the request was merely queued. */
function commit(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("The save was aborted"));
  });
}

/** The pages as the localStorage version saved them — also the fallback if IndexedDB can't be opened. */
export function readLegacyEntries(): JournalEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as JournalEntry[];
  } catch {
    return [];
  }
}

export async function loadStoredEntries(): Promise<JournalEntry[]> {
  const db = await openDb();
  const tx = db.transaction([ENTRIES, META], "readwrite");
  const entries = tx.objectStore(ENTRIES);
  const meta = tx.objectStore(META);
  let result: JournalEntry[] = [];

  const migrated = meta.get(MIGRATED_KEY);
  migrated.onsuccess = () => {
    if (!migrated.result) {
      // First run: bring over the localStorage pages. Written in the same
      // transaction as the flag, so it's all-or-nothing and can't half-happen.
      for (const entry of readLegacyEntries()) entries.put(entry);
      meta.put(true, MIGRATED_KEY);
    }
    const all = entries.getAll();
    all.onsuccess = () => {
      result = all.result as JournalEntry[];
    };
  };

  await commit(tx);
  return result;
}

export async function saveStoredEntry(entry: JournalEntry): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(ENTRIES, "readwrite");
  tx.objectStore(ENTRIES).put(entry);
  await commit(tx);
}

export async function deleteStoredEntry(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(ENTRIES, "readwrite");
  tx.objectStore(ENTRIES).delete(id);
  await commit(tx);
}

/**
 * Asks the browser to keep the album's storage even when the disk runs low
 * (by default site storage is "best effort" and can be evicted). Chrome
 * decides on its own without prompting; it's harmless if refused.
 */
export function requestPersistentStorage() {
  navigator.storage?.persist?.().catch(() => {});
}
