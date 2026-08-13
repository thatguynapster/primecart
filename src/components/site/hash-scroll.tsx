"use client";

import { useEffect } from "react";

/**
 * Scrolls to the URL's hash target on first load.
 *
 * The browser does try this itself, but it fires while the document is still
 * settling — fonts swapping and hydration both move content — so it either
 * lands in the wrong place or, if the target has not been laid out yet, does
 * nothing at all. Retrying across a few frames waits for a stable position.
 *
 * Only the initial load needs this. Clicking an in-page anchor afterwards is
 * handled natively, with `motion-safe:scroll-smooth` on <html>.
 */
export function HashScroll() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.length < 2) return;

    // Strip the leading '#'. getElementById rather than querySelector so an
    // odd hash cannot throw an invalid-selector error.
    let id: string;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let frame = 0;
    let cancelled = false;

    // scrollIntoView honours the target's scroll-margin-top, which is what
    // keeps the heading clear of the sticky header.
    const attempt = () => {
      if (cancelled) return;

      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
        return;
      }

      // ~10 frames is enough for hydration and font swap without leaving a
      // timer running if the id simply does not exist.
      if (frame < 10) {
        frame += 1;
        requestAnimationFrame(attempt);
      }
    };

    requestAnimationFrame(attempt);

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
