"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
        themeParams?: Record<string, string>;
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

type SessionPayload = {
  ok?: boolean;
  nextPath?: string;
  profile?: {
    id: string;
    role: "admin" | "member";
    access_status: "active" | "disabled";
    auth_source?: "web" | "telegram";
    telegram_id?: string | null;
    telegram_username?: string | null;
  } | null;
};

const AUTH_TIMEOUT_MS = 12000;
const SESSION_TIMEOUT_MS = 8000;
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
    return fallbackPath || "/tg/support";
  }

  return pathname;
}

export function TelegramAuthGate({ pathname }: { pathname: string }) {
  const router = useRouter();
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

    function log(...args: unknown[]) {
      console.log("[TelegramAuthGate]", ...args);
    }

    function setLoadingState(next: Partial<GateState>) {
      setState((prev) => {
        const updated = { ...prev, ...next };
        log("loading state changes", updated);
        return updated;
      });
    }

    async function waitForTelegramWebApp() {
      for (let attempt = 0; attempt < TELEGRAM_INIT_RETRY_LIMIT; attempt += 1) {
        const webApp = window.Telegram?.WebApp;
        log("Telegram WebApp object exists", Boolean(webApp), { attempt });

        if (webApp?.initData) {
          log("initData length", webApp.initData.length);
          return webApp;
        }

        await new Promise((resolve) => window.setTimeout(resolve, TELEGRAM_INIT_RETRY_MS));
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
          message: "Проверяю Telegram-подпись и открываю клуб..."
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

        log("/api/telegram/auth response status", response.status);
        const payload = await parseJsonSafe<AuthPayload>(response);
        log("response json", payload);

        if (!response.ok) {
          throw new Error(payload?.error || "Не удалось войти через Telegram");
        }

        setLoadingState({
          message: "Проверяю сессию Telegram..."
        });

        const sessionResponse = await fetchWithTimeout(
          "/api/telegram/session",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
              "cache-control": "no-store"
            }
          },
          SESSION_TIMEOUT_MS
        );

        const sessionPayload = await parseJsonSafe<SessionPayload>(sessionResponse);
        log("cookie/session/profile result", {
          status: sessionResponse.status,
          sessionPayload
        });

        if (!sessionResponse.ok || !sessionPayload?.ok || !sessionPayload.profile) {
          throw new Error("Telegram-сессия не подтвердилась после авторизации.");
        }

        if (cancelled || runIdRef.current !== runId) {
          return;
        }

        const nextPath = normalizePath(pathname, payload?.nextPath || sessionPayload.nextPath);
        log("router navigation", {
          pathname,
          nextPath
        });

        setLoadingState({
          loading: false,
          message: "Открываю клуб..."
        });

        router.replace(nextPath as Route);
        window.setTimeout(() => {
          if (!cancelled && window.location.pathname !== nextPath) {
            log("router fallback navigation", {
              currentPath: window.location.pathname,
              nextPath
            });
            window.location.assign(nextPath);
          }
        }, 1200);
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
  }, [pathname, retryTick, router]);

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
            onClick={() => {
              console.log("[TelegramAuthGate] retry requested");
              setRetryTick((value) => value + 1);
            }}
            className="mt-5 w-full rounded-2xl border border-accent/35 bg-accent/10 px-4 py-3 text-sm font-medium text-accentSoft transition hover:bg-accent/20"
          >
            Попробовать снова
          </button>
        ) : null}
      </div>
    </div>
  );
}
