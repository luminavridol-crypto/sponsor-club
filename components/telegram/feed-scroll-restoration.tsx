"use client";

import { useEffect } from "react";

const FEED_SCROLL_KEY = "tg-content-scroll-y";
const RESTORE_ATTEMPTS = 6;
const RESTORE_DELAY_MS = 140;

export function FeedScrollRestoration() {
  useEffect(() => {
    const rawValue = sessionStorage.getItem(FEED_SCROLL_KEY);

    if (!rawValue) {
      return;
    }

    const targetY = Number(rawValue);

    if (!Number.isFinite(targetY) || targetY < 0) {
      sessionStorage.removeItem(FEED_SCROLL_KEY);
      return;
    }

    let cancelled = false;
    let attempt = 0;

    const restore = () => {
      if (cancelled) {
        return;
      }

      window.scrollTo(0, targetY);
      attempt += 1;

      const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const closeEnough = Math.abs(window.scrollY - Math.min(targetY, maxScrollY)) < 8;

      if (closeEnough || attempt >= RESTORE_ATTEMPTS) {
        sessionStorage.removeItem(FEED_SCROLL_KEY);
        return;
      }

      window.setTimeout(restore, RESTORE_DELAY_MS);
    };

    window.requestAnimationFrame(() => {
      restore();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
