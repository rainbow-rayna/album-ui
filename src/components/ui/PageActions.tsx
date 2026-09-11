import { useBookStore } from "../../store/useBookStore";
import { useJournalStore } from "../../store/useJournalStore";

/**
 * Bottom-right page controls — only make sense once the album is open
 * (mirrors PageNavBar's isOpen gate). "Edit pages" opens a picker rather
 * than acting on whatever is on screen, so the page to redo or delete is
 * always an explicit choice.
 */
export default function PageActions() {
  const isOpen = useBookStore((s) => s.isOpen);
  const openComposer = useBookStore((s) => s.openComposer);
  const openPagesPanel = useBookStore((s) => s.openPagesPanel);
  const hasEntries = useJournalStore((s) => s.entries.length > 0);

  if (!isOpen) return null;

  return (
    <div className="page-actions">
      {hasEntries && (
        <button type="button" className="page-action-btn page-action-btn--quiet" onClick={openPagesPanel}>
          Edit pages
        </button>
      )}
      <button type="button" className="page-action-btn" onClick={openComposer}>
        + New page
      </button>
    </div>
  );
}
