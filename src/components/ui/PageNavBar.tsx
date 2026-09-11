import { useBookStore } from "../../store/useBookStore";
import { useJournalStore } from "../../store/useJournalStore";
import { nextPage, prevPage } from "../../utils/pageNav";

// Re-derives the same leaf count as getTotalPages() (useJournalStore.ts) —
// duplicated as a reactive selector so this counter re-renders on entries
// changes instead of reading through the non-reactive getState() helper.
const selectTotalPages = (s: { entries: unknown[] }) => (s.entries.length === 0 ? 0 : s.entries.length + 1);

/**
 * Bottom nav strip shown once the album is open: prev/next chevrons plus a
 * plain page counter, mirroring the Wispal reference's side-arrow +
 * filmstrip framework. Kept to a numeric counter rather than a chapter/photo
 * filmstrip since there's no real per-page content yet to show thumbnails
 * of. Plain DOM buttons — same reliability reasoning as CoverCTA.
 */
export default function PageNavBar() {
  const isOpen = useBookStore((s) => s.isOpen);
  const currentPage = useBookStore((s) => s.currentPage);
  const isAnimating = useBookStore((s) => s.isAnimating);
  const totalPages = useJournalStore(selectTotalPages);

  if (!isOpen) return null;

  return (
    <div className="page-nav">
      <button
        type="button"
        className="page-nav__arrow"
        disabled={isAnimating || currentPage <= 0}
        onClick={prevPage}
        aria-label="Previous page"
      >
        ←
      </button>
      <span className="page-nav__count">
        {currentPage} / {totalPages}
      </span>
      <button
        type="button"
        className="page-nav__arrow"
        disabled={isAnimating || currentPage >= totalPages}
        onClick={nextPage}
        aria-label="Next page"
      >
        →
      </button>
    </div>
  );
}
