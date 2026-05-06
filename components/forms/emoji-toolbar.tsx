"use client";

const DEFAULT_EMOJIS = ["✨", "❤️", "🔥", "😍", "🥰", "😭", "🫶", "🙌", "💌", "🌙", "🎀", "💫"];

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
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.18em] text-white/38">{label}</p>
      <div className="flex flex-wrap gap-2">
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
            }}
            className="inline-flex h-10 min-w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-lg transition hover:border-cyanGlow/30 hover:bg-cyanGlow/10"
            aria-label={`Вставить ${emoji}`}
            title={`Вставить ${emoji}`}
          >
            <span aria-hidden="true">{emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
