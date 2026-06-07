"use client";

import { useEffect } from "react";

export function FeedSeenMarker() {
  useEffect(() => {
    void fetch("/api/notifications/content-seen", {
      method: "POST",
      cache: "no-store",
      keepalive: true
    }).catch(() => undefined);
  }, []);

  return null;
}
