'use client';

import { useState } from "react";

const LOCAL_STORAGE_PREFIXES = ["lumina."];
const LOCAL_STORAGE_KEYS = ["tg-content-scroll-y"];
const SESSION_STORAGE_KEYS = ["tg-content-scroll-y"];

function clearKnownStorageKeys() {
  for (const key of LOCAL_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }

  for (const key of SESSION_STORAGE_KEYS) {
    window.sessionStorage.removeItem(key);
  }

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);

    if (!key) continue;

    if (LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      window.localStorage.removeItem(key);
    }
  }
}

export function ClearAppCacheButton() {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) {
      return;
    }

    const confirmed = window.confirm("Очистить локальный кеш и перезагрузить приложение?");

    if (!confirmed) {
      return;
    }

    setPending(true);

    try {
      clearKnownStorageKeys();

      if ("caches" in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
      }
    } finally {
      setPending(false);
      window.location.reload();
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70 transition hover:border-white/16 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Чищу..." : "Очистить кеш"}
    </button>
  );
}
