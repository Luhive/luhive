import { useEffect, useRef } from "react";
import { useIsPageNavigationPending } from "~/shared/hooks/use-is-page-navigation-pending";

/** Matches the longest `complete` transition in app.css (opacity delay + duration). */
const COMPLETE_TRANSITION_MS = 350;

export function NavigationProgress() {
  const isPending = useIsPageNavigationPending();
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    if (isPending) {
      if (bar.dataset.state === "complete") {
        // Restart from empty instead of shrinking back from a finished bar.
        delete bar.dataset.state;
        bar.getBoundingClientRect();
      }
      bar.dataset.state = "loading";
      return;
    }

    if (bar.dataset.state !== "loading") return;
    bar.dataset.state = "complete";
    const resetTimeout = window.setTimeout(() => {
      delete bar.dataset.state;
    }, COMPLETE_TRANSITION_MS);
    return () => window.clearTimeout(resetTimeout);
  }, [isPending]);

  return (
    <div
      ref={barRef}
      role="progressbar"
      aria-label="Loading page"
      aria-hidden={!isPending}
      className="navigation-progress pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-[100] h-[3px] bg-primary"
    />
  );
}
