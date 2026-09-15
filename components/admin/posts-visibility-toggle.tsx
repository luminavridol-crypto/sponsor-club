"use client";

import { ReactNode, useEffect, useState } from "react";

export function PostsVisibilityToggle({
  children,
  defaultOpen = false
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!window.location.hash.startsWith("#post-")) return;
    const frame = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!open || !window.location.hash.startsWith("#post-")) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-accent/35 hover:bg-white/10 hover:text-white"
      >
        {open ? "Скрыть посты" : "Открыть посты"}
      </button>

      {open ? <div className="space-y-3">{children}</div> : null}
    </section>
  );
}
