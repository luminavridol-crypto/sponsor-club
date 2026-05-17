"use client";

import { useEffect } from "react";

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

export function TelegramMiniAppBridge() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;

    if (!webApp) {
      return;
    }

    webApp.ready();
    webApp.expand();
    applyTheme(webApp.themeParams);
  }, []);

  return null;
}
