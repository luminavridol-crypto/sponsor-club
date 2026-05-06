"use client";

import { ReactNode, useState } from "react";

export function PostsVisibilityToggle({
  children,
  defaultOpen = false
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

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
