"use client";

import { useEffect, useMemo, useState } from "react";

type ReactionItem = {
  emoji: string;
  label: string;
};

const reactionOptions: ReactionItem[] = [
  { emoji: "❤️", label: "Нравится" },
  { emoji: "🔥", label: "Огонь" },
  { emoji: "😭", label: "До слёз" },
  { emoji: "✨", label: "Вау" },
  { emoji: "😈", label: "Дерзко" }
];

function getStorageKey(postId: string) {
  return `lumina.post-reaction.${postId}`;
}

export function PostReactions({ postId }: { postId: string }) {
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(getStorageKey(postId));
      setSelectedReaction(stored || null);
    } catch {
      setSelectedReaction(null);
    }
  }, [postId]);

  const reactionCounts = useMemo(() => {
    return reactionOptions.map((item) => ({
      ...item,
      count: selectedReaction === item.emoji ? 1 : 0
    }));
  }, [selectedReaction]);

  function toggleReaction(emoji: string) {
    const nextReaction = selectedReaction === emoji ? null : emoji;
    setSelectedReaction(nextReaction);

    try {
      const storageKey = getStorageKey(postId);

      if (nextReaction) {
        window.localStorage.setItem(storageKey, nextReaction);
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch {
      // Ignore local storage issues and keep UI responsive.
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {reactionCounts.map((item) => {
        const active = selectedReaction === item.emoji;

        return (
          <button
            key={item.emoji}
            type="button"
            aria-label={`${item.label}: ${item.count}`}
            aria-pressed={active}
            title={item.label}
            onClick={() => toggleReaction(item.emoji)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
              active
                ? "border-accent/40 bg-accent/15 text-white"
                : "border-white/10 bg-white/[0.04] text-white/70 hover:border-accent/25 hover:text-white"
            }`}
          >
            <span className="text-base leading-none">{item.emoji}</span>
            <span>{item.count}</span>
          </button>
        );
      })}
    </div>
  );
}
