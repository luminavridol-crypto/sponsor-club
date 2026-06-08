"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
        themeParams?: Record<string, string>;
        HapticFeedback?: {
          impactOccurred?: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
        };
      };
    };
  }
}

type GateState = {
  error: string | null;
  loading: boolean;
  message: string;
};

type AuthPayload = {
  ok?: boolean;
  error?: string;
  nextPath?: string;
  profile?: {
    id: string;
    role: "admin" | "member";
    access_status: "active" | "disabled";
    telegram_id?: string | null;
    telegram_username?: string | null;
  } | null;
};

const AUTH_TIMEOUT_MS = 12000;
const TELEGRAM_INIT_RETRY_LIMIT = 10;
const TELEGRAM_INIT_RETRY_MS = 250;

function applyTheme(themeParams?: Record<string, string>) {
  if (!themeParams) {
    return;
  }

  Object.entries(themeParams).forEach(([key, value]) => {
    document.documentElement.style.setProperty(
      `--tg-theme-${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`,
      value
    );
  });
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(new Error("Request timeout")), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("[TelegramAuthGate] Failed to parse JSON", error, text);
    return null;
  }
}

function normalizePath(pathname: string, fallbackPath?: string) {
  if (pathname === "/tg") {
    return fallbackPath || "/tg/tiers";
  }

  return pathname;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function TelegramAuthGate({ pathname }: { pathname: string }) {
  const runIdRef = useRef(0);
  const startedRef = useRef(false);
  const [retryTick, setRetryTick] = useState(0);
  const [state, setState] = useState<GateState>({
    error: null,
    loading: true,
    message: "Подключаю Telegram Mini App..."
  });

  useEffect(() => {
    if (startedRef.current && retryTick === 0) {
      return;
    }

    startedRef.current = true;
    runIdRef.current += 1;
    const runId = runIdRef.current;
    let cancelled = false;

    function setLoadingState(next: Partial<GateState>) {
      setState((prev) => ({ ...prev, ...next }));
    }

    async function waitForTelegramWebApp() {
      for (let attempt = 0; attempt < TELEGRAM_INIT_RETRY_LIMIT; attempt += 1) {
        const webApp = window.Telegram?.WebApp;

        if (webApp?.initData) {
          return webApp;
        }

        await sleep(TELEGRAM_INIT_RETRY_MS);
      }

      return window.Telegram?.WebApp;
    }

    async function authenticate() {
      setLoadingState({
        loading: true,
        error: null,
        message: "Подключаю Telegram Mini App..."
      });

      try {
        const webApp = await waitForTelegramWebApp();

        if (!webApp?.initData) {
          throw new Error("Telegram WebApp не передал initData. Открой приложение внутри Telegram и попробуй снова.");
        }

        webApp.ready();
        webApp.expand();
        applyTheme(webApp.themeParams);

        setLoadingState({
          message: "Проверяю Telegram и открываю клуб..."
        });

        const response = await fetchWithTimeout(
          "/api/telegram/auth",
          {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
              initData: webApp.initData
            })
          },
          AUTH_TIMEOUT_MS
        );

        const payload = await parseJsonSafe<AuthPayload>(response);

        if (!response.ok) {
          throw new Error(payload?.error || "Не удалось войти через Telegram");
        }

        if (cancelled || runIdRef.current !== runId) {
          return;
        }

        const nextPath = normalizePath(pathname, payload?.nextPath);

        setLoadingState({
          loading: false,
          message: "Открываю клуб..."
        });

        window.location.replace(nextPath);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Неизвестная ошибка";
        console.error("[TelegramAuthGate] Auth flow failed", error);

        if (cancelled || runIdRef.current !== runId) {
          return;
        }

        setLoadingState({
          loading: false,
          error: reason,
          message: "Не удалось войти через Telegram"
        });
      }
    }

    void authenticate();

    return () => {
      cancelled = true;
    };
  }, [pathname, retryTick]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05060d] px-5 text-white">
      <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/5 p-6 text-center shadow-glow">
        <p className="text-xs uppercase tracking-[0.32em] text-accentSoft">Telegram Mini App</p>
        <h1 className="mt-3 text-2xl font-semibold">Lumina Club</h1>
        <p className="mt-4 text-sm leading-6 text-white/65">{state.message}</p>
        {state.error ? <p className="mt-3 text-sm leading-6 text-rose-200">{state.error}</p> : null}
        {!state.loading ? (
          <button
            type="button"
            onClick={() => setRetryTick((value) => value + 1)}
            className="mt-5 w-full rounded-2xl border border-accent/35 bg-accent/10 px-4 py-3 text-sm font-medium text-accentSoft transition hover:bg-accent/20"
          >
            Попробовать снова
          </button>
        ) : null}
      </div>
    </div>
  );
}
