import { useJournalStore } from "../../store/useJournalStore";

/**
 * Tells the user when a change didn't make it into storage. Sits above every
 * overlay (the composer and the Edit pages panel included), since that's
 * where saves are usually triggered from.
 */
export default function SaveErrorBanner() {
  const error = useJournalStore((s) => s.saveError);
  const dismiss = useJournalStore((s) => s.dismissSaveError);

  if (!error) return null;

  return (
    <div className="save-error" role="alert">
      <span>{error}</span>
      <button type="button" onClick={dismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
