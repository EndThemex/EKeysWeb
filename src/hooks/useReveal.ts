import { useEffect, useState } from "react";

/**
 * useReveal — observes every `[data-reveal]` descendant of `root` and adds
 * `is-revealed` once it enters the viewport. Runs once per element.
 *
 * Returns a callback ref that should be attached to the root element.
 * Re-observes automatically whenever the root changes (e.g. after route
 * navigation remounts <main>).
 *
 * Falls back to immediate reveal when the user prefers reduced motion or
 * when IntersectionObserver isn't available, so content is never left hidden.
 */
export function useReveal(): (node: HTMLElement | null) => void {
  const [root, setRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!root) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    if (reduce || typeof IntersectionObserver === "undefined") {
      targets.forEach((el) => el.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );

    targets.forEach((el, i) => {
      // Cap the cascade so a 20-item grid doesn't wait 2 seconds for the
      // last row. Use a small per-element stagger (40ms) for rhythm.
      const delay = Math.min(i, 8) * 40;
      el.style.setProperty("--reveal-delay", `${delay}ms`);
      observer.observe(el);
    });

    // Safety net: if the observer never fires within 1.2s (e.g. element
    // starts outside viewport but later user resizes, etc.), reveal
    // everything so text can never stay permanently hidden.
    const fallback = window.setTimeout(() => {
      targets.forEach((el) => el.classList.add("is-revealed"));
    }, 1200);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [root]);

  // Returned callback ref re-renders the component (via setRoot) each time
  // a new root node is attached, which re-runs the effect above.
  return setRoot;
}
