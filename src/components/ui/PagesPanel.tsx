import { useEffect, useState } from "react";
import { useBookStore } from "../../store/useBookStore";
import { useJournalStore } from "../../store/useJournalStore";
import { snapTo } from "../../utils/pageNav";
import { forgetEntryTextures } from "../../journal/pageTexture";
import { generatePageImage } from "../../journal/ai";
import { FlatPageImage } from "./FlatPageImage";
import { imageProvidersFor } from "../../../shared/ai";
import type { JournalEntry } from "../../journal/types";

function snippet(entry: JournalEntry): string {
  const source = entry.text || entry.caption;
  if (!source) return "No journal text";
  return source.length > 80 ? source.slice(0, 80).trimEnd() + "…" : source;
}

function Thumbnail({ entry }: { entry: JournalEntry }) {
  if (entry.aiImage) return <FlatPageImage className="pages-card__thumb" src={entry.aiImage} />;
  if (entry.photos[0]) return <img className="pages-card__thumb" src={entry.photos[0]} alt="" />;
  return (
    <div className="pages-card__thumb pages-card__thumb--text" style={{ background: entry.layoutSpec.palette.bg }}>
      {entry.caption || entry.text}
    </div>
  );
}

type Notice = { text: string; error?: boolean } | null;

/** The picture a redo replaced, kept until the panel closes so it can be put back. */
interface Replaced {
  id: string;
  pageNumber: number;
  image: string | null;
}

/**
 * "Edit pages" overlay: pick a page, then either redo its picture or delete
 * it. Opens with the page currently showing in the book pre-selected.
 *
 * Redo picture exists for pages whose AI picture came out wrong — e.g. ones
 * made before the flat-page fix that look like a photo of a scrapbook rather
 * than a page of one. It re-renders just the picture (through the same
 * server pipeline as a new page, flat-page check included) and keeps the
 * journal text, reflection and photos, so there's no need to redo the chat.
 *
 * Delete asks for confirmation first — the entry is gone from storage for
 * good. The panel stays open afterwards so several pages can be handled
 * in one go.
 */
export function PagesPanel() {
  const open = useBookStore((s) => s.pagesPanelOpen);
  const close = useBookStore((s) => s.closePagesPanel);
  const currentPage = useBookStore((s) => s.currentPage);
  const entries = useJournalStore((s) => s.entries);
  const removeEntry = useJournalStore((s) => s.removeEntry);
  const updateEntry = useJournalStore((s) => s.updateEntry);
  const aiStatus = useJournalStore((s) => s.aiStatus);
  const refreshAiStatus = useJournalStore((s) => s.refreshAiStatus);
  const hasAnyImageProvider = aiStatus.gemini || aiStatus.openai;
  // Pages with photos can only be redrawn by Gemini (imageProvidersFor).
  const canRedo = (entry: JournalEntry) => imageProvidersFor(entry.photos.length).some((p) => aiStatus[p]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [redoingId, setRedoingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [replaced, setReplaced] = useState<Replaced | null>(null);

  // Page p in the book shows entry p-1's spread (see useJournalStore's
  // getLeafFaces), so that's the one "open now".
  const openIndex = currentPage - 1;

  useEffect(() => {
    if (!open) return;
    setSelectedId(entries[openIndex]?.id ?? null);
    setConfirmingDelete(false);
    setNotice(null);
    setReplaced(null);
    // Redo needs an image provider; the .env may have changed since load.
    void refreshAiStatus();
    // Only on open — not every time the entry list changes underneath.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  const selectedIndex = entries.findIndex((e) => e.id === selectedId);
  const selected = selectedIndex >= 0 ? entries[selectedIndex] : null;
  const busy = redoingId !== null;

  function select(id: string) {
    setSelectedId(id);
    setConfirmingDelete(false);
    setNotice(null);
  }

  // The cached texture is keyed by entry id, so drop it before swapping the
  // picture or the book would keep showing the old one.
  function setPicture(id: string, image: string | null) {
    forgetEntryTextures(id);
    updateEntry(id, { aiImage: image });
  }

  async function redoPicture() {
    if (!selected) return;
    const entry = selected;
    const pageNumber = selectedIndex + 1;
    setRedoingId(entry.id);
    setReplaced(null);
    setNotice({ text: `Drawing a new picture for page ${pageNumber}… this can take up to a minute.` });
    try {
      const { image } = await generatePageImage(entry, entry.layoutSpec.family);
      setPicture(entry.id, image);
      setReplaced({ id: entry.id, pageNumber, image: entry.aiImage });
      setNotice({ text: `Page ${pageNumber} has a new picture. Your journal text is unchanged.` });
    } catch (err) {
      setNotice({
        text: `${(err as Error)?.message || "Couldn't draw a new picture"} — page ${pageNumber} is unchanged.`,
        error: true,
      });
    } finally {
      setRedoingId(null);
    }
  }

  function undoRedo() {
    if (!replaced) return;
    setPicture(replaced.id, replaced.image);
    setNotice({ text: `Page ${replaced.pageNumber}'s previous picture is back.` });
    setReplaced(null);
  }

  function deleteSelected() {
    if (!selected) return;
    const { currentPage: page } = useBookStore.getState();
    removeEntry(selected.id);
    forgetEntryTextures(selected.id);
    if (replaced?.id === selected.id) setReplaced(null);

    // Keep the reader on the same spread where possible: deleting an earlier
    // page shifts everything after it back by one, deleting the open page
    // reveals the next one, and deleting the last page falls back to the
    // new last page rather than a blank one.
    const remaining = useJournalStore.getState().entries.length;
    const target = selectedIndex < page - 1 ? page - 1 : page;
    snapTo(Math.min(target, remaining));

    setSelectedId(null);
    setConfirmingDelete(false);
    if (remaining === 0) {
      close();
      return;
    }
    setNotice({ text: `Deleted page ${selectedIndex + 1} (${selected.dateLabel}).` });
  }

  return (
    <div className="composer-overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="composer-panel pages-panel" role="dialog" aria-modal="true" aria-labelledby="pages-panel-title">
        <button className="modal-close" onClick={close} aria-label="Close">
          ✕
        </button>
        <div className="composer-scroll">
          <section className="composer-step">
            <div className="step-header">
              <span className="step-eyebrow">
                {entries.length} page{entries.length === 1 ? "" : "s"} in this album
              </span>
              <h2 id="pages-panel-title">Edit pages</h2>
              <p className="step-sub">
                Choose a page, then redo its picture or delete it. Redoing keeps your journal text.
              </p>
            </div>

            <div className="pages-grid">
              {entries.map((entry, i) => (
                <button
                  key={entry.id}
                  type="button"
                  className={
                    "pages-card" +
                    (entry.id === selectedId ? " is-selected" : "") +
                    (entry.id === redoingId ? " is-busy" : "")
                  }
                  aria-pressed={entry.id === selectedId}
                  disabled={busy}
                  onClick={() => select(entry.id)}
                >
                  <span className="pages-card__frame">
                    <Thumbnail entry={entry} />
                    {entry.id === redoingId && <span className="pages-card__busy">Drawing…</span>}
                  </span>
                  <span className="pages-card__meta">
                    <span className="pages-card__title">
                      Page {i + 1}
                      {i === openIndex && <span className="pages-card__badge">open now</span>}
                    </span>
                    <span className="pages-card__date">{entry.dateLabel}</span>
                    <span className="pages-card__snippet">{snippet(entry)}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="pages-footer" aria-live="polite">
          {confirmingDelete && selected ? (
            <>
              <p className="pages-footer__msg">
                Delete page {selectedIndex + 1} ({selected.dateLabel})? Its picture and journal text will be gone for
                good.
              </p>
              <div className="pages-footer__actions">
                <button className="btn btn-ghost" onClick={() => setConfirmingDelete(false)}>
                  Keep it
                </button>
                <button className="btn btn-danger" onClick={deleteSelected} autoFocus>
                  Yes, delete it
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={"pages-footer__msg" + (notice?.error ? " is-error" : "")}>
                {notice?.text || (selected ? `Page ${selectedIndex + 1} selected.` : "Nothing selected yet.")}
                {replaced && !busy && (
                  <>
                    {" "}
                    <button type="button" className="pages-footer__link" onClick={undoRedo}>
                      Undo
                    </button>
                  </>
                )}
              </p>
              <div className="pages-footer__actions">
                <button className="btn btn-ghost" onClick={close}>
                  Done
                </button>
                {hasAnyImageProvider && (
                  <button
                    className="btn btn-secondary"
                    disabled={!selected || busy || !canRedo(selected)}
                    title={selected && !canRedo(selected) ? "Pages with photos are redrawn with Gemini, which isn't set up" : undefined}
                    onClick={redoPicture}
                  >
                    Redo picture
                  </button>
                )}
                <button className="btn btn-danger" disabled={!selected || busy} onClick={() => setConfirmingDelete(true)}>
                  Delete page
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
