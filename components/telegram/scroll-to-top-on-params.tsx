"use client";

import { useEffect } from "react";

export function ScrollToTopOnParams({
  active
}: {
  active: boolean;
}) {
  useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;

    const scrollToTop = () => {
      if (cancelled) {
        return;
      }

      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    window.requestAnimationFrame(() => {
      scrollToTop();
      window.setTimeout(scrollToTop, 80);
      window.setTimeout(scrollToTop, 220);
    });

    return () => {
      cancelled = true;
    };
  }, [active]);

  return null;
}
