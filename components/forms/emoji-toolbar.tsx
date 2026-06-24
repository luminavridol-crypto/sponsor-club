"use client";

import { useState } from "react";

const DEFAULT_EMOJIS = [
  "\u2728",
  "\u2764\uFE0F",
  "\u{1F525}",
  "\u{1F60D}",
  "\u{1F970}",
  "\u{1F62D}",
  "\u{1FAF6}",
  "\u{1F64C}",
  "\u{1F48C}",
  "\u{1F319}",
  "\u{1F380}",
  "\u{1F4AB}"
];

function insertAtCursor(textarea: HTMLTextAreaElement, emoji: string) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
  const prefix = needsLeadingSpace ? " " : "";
  const suffix = after.startsWith(" ") || after.length === 0 ? "" : " ";
  const insertion = `${prefix}${emoji}${suffix}`;
  const nextValue = `${before}${insertion}${after}`;
  const nextCursor = before.length + insertion.length;

  textarea.value = nextValue;
  textarea.focus();
  textarea.setSelectionRange(nextCursor, nextCursor);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

export function EmojiToolbar({
  targetId,
  label = "Эмодзи для сообщения",
  emojis = DEFAULT_EMOJIS
}: {
  targetId: string;
  label?: string;
  emojis?: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-white/38">{label}</p>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={`inline-flex h-10 min-w-10 items-center justify-center rounded-2xl border px-3 text-lg transition ${
            open
              ? "border-cyanGlow/30 bg-cyanGlow/10 text-white"
              : "border-white/10 bg-white/[0.03] text-white/72 hover:border-cyanGlow/30 hover:bg-cyanGlow/10 hover:text-white"
          }`}
          aria-expanded={open}
          aria-label={open ? "Скрыть эмодзи" : "Показать эмодзи"}
          title={open ? "Скрыть эмодзи" : "Показать эмодзи"}
        >
          <span aria-hidden="true">{"\u{1F642}"}</span>
        </button>
      </div>

      {open ? (
        <div className="flex flex-wrap gap-2 rounded-[20px] border border-white/10 bg-black/16 p-3">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                const element = document.getElementById(targetId);

                if (!(element instanceof HTMLTextAreaElement)) {
                  return;
                }

                insertAtCursor(element, emoji);
                setOpen(false);
              }}
              className="inline-flex h-10 min-w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-lg transition hover:border-cyanGlow/30 hover:bg-cyanGlow/10"
              aria-label={`Вставить ${emoji}`}
              title={`Вставить ${emoji}`}
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
