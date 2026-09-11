import gsap from "gsap";
import { useBookStore } from "../store/useBookStore";
import { getTotalPages } from "../store/useJournalStore";
import { readProgress } from "./readProgress";

// Without this, a tab that was backgrounded mid-tween resumes with GSAP's
// large-gap safety clamp spreading the catch-up across many ticks instead
// of just landing on target — the flip would visibly stall/crawl after
// switching back to the tab instead of simply being wherever it should be.
gsap.ticker.lagSmoothing(0);

const NAV_DURATION = 0.7;

// A plain tween proxy — no DOM element needed. Both keyboard nav (Book.tsx)
// and clicking a page (PagePool.tsx) animate through this single shared
// tween so grabbing one mid-flight (via navigateTo below) cleanly replaces
// the other rather than fighting it.
const proxy = { pos: 0 };

export function navigateTo(target: number) {
  const { isAnimating, currentPage, setAnimating, setCurrentPage } = useBookStore.getState();
  if (isAnimating) return;
  const clamped = Math.max(0, Math.min(getTotalPages(), target));
  if (clamped === currentPage) return;
  proxy.pos = readProgress.current;
  setAnimating(true);
  gsap.killTweensOf(proxy);
  gsap.to(proxy, {
    pos: clamped,
    duration: NAV_DURATION,
    ease: "power3.inOut",
    onUpdate: () => {
      readProgress.current = proxy.pos;
    },
    onComplete: () => {
      setCurrentPage(clamped);
      setAnimating(false);
    },
  });
}

/**
 * Jumps straight to a page with no flip animation — for when the pages
 * themselves changed underneath the reader (an entry was deleted), where
 * animating through the shifted pages would just be noise.
 */
export function snapTo(target: number) {
  const { setAnimating, setCurrentPage } = useBookStore.getState();
  const clamped = Math.max(0, Math.min(getTotalPages(), target));
  gsap.killTweensOf(proxy);
  proxy.pos = clamped;
  readProgress.current = clamped;
  setAnimating(false);
  setCurrentPage(clamped);
}

export function nextPage() {
  navigateTo(useBookStore.getState().currentPage + 1);
}

export function prevPage() {
  navigateTo(useBookStore.getState().currentPage - 1);
}
