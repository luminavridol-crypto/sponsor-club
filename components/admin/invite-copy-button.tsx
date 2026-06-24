"use client";

import { useState, useTransition } from "react";

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

export function InviteCopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);

      startTransition(() => {
        window.setTimeout(() => setCopied(false), 1600);
      });
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] text-white/72 transition hover:border-white/16 hover:bg-white/[0.07] hover:text-white"
      aria-label={copied ? "Скопировано" : "Скопировать ссылку"}
      title={copied ? "Скопировано" : "Скопировать ссылку"}
      disabled={isPending}
    >
      <CopyIcon />
    </button>
  );
}
