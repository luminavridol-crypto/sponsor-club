"use client";

import { useEffect, useState } from "react";

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

function applyTheme(themeParams?: Record<string, string>) {
  if (!themeParams) {
    return;
  }

  Object.entries(themeParams).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--tg-theme-${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`, value);
  });
}

export function TelegramAuthGate({ pathname }: { pathname: string }) {
  const [message, setMessage] = useState("Подключаю Telegram Mini App...");

  useEffect(() => {
    let cancelled = false;

    async function authenticate() {
      const webApp = window.Telegram?.WebApp;

      if (!webApp?.initData) {
        setMessage("Открой это приложение внутри Telegram.");
        return;
      }

      webApp.ready();
      webApp.expand();
      applyTheme(webApp.themeParams);
      setMessage("Проверяю Telegram-подпись и открываю клуб...");

      const response = await fetch("/api/telegram/auth", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          initData: webApp.initData
        })
      });

      if (!response.ok) {
        setMessage("Не удалось авторизовать Telegram-пользователя.");
        return;
      }

      const payload = (await response.json()) as { nextPath?: string };

      if (cancelled) {
        return;
      }

      const nextPath = pathname === "/tg" ? payload.nextPath || "/tg/support" : pathname;
      window.location.replace(nextPath);
    }

    void authenticate();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05060d] px-5 text-white">
      <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/5 p-6 text-center shadow-glow">
        <p className="text-xs uppercase tracking-[0.32em] text-accentSoft">Telegram Mini App</p>
        <h1 className="mt-3 text-2xl font-semibold">Lumina Club</h1>
        <p className="mt-4 text-sm leading-6 text-white/65">{message}</p>
      </div>
    </div>
  );
}
