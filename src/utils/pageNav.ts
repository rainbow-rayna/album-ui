import gsap from "gsap";
import { useBookStore, TOTAL_PAGES } from "../store/useBookStore";
import { readProgress } from "./readProgress";

const NAV_DURATION = 0.7;

// A plain tween proxy — no DOM element needed. Both keyboard nav (Book.tsx)
// and clicking a page (PagePool.tsx) animate through this single shared
// tween so grabbing one mid-flight (via navigateTo below) cleanly replaces
// the other rather than fighting it.
const proxy = { pos: 0 };

export function navigateTo(target: number) {
  const { isAnimating, currentPage, setAnimating, setCurrentPage } = useBookStore.getState();
  if (isAnimating) return;
  const clamped = Math.max(0, Math.min(TOTAL_PAGES, target));
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

export function nextPage() {
  navigateTo(useBookStore.getState().currentPage + 1);
}

export function prevPage() {
  navigateTo(useBookStore.getState().currentPage - 1);
}
