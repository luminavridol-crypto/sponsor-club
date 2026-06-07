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
        HapticFeedback?: {
          impactOccurred?: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
        };
      };
    };
  }
}

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

function playUiClick() {
  try {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    const audioContext = new AudioContextCtor();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(720, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(560, audioContext.currentTime + 0.08);

    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.11);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.11);

    void audioContext.close().catch(() => undefined);
  } catch {
    return;
  }
}

export function TelegramMiniAppBridge() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;

    if (webApp) {
      webApp.ready();
      webApp.expand();
      applyTheme(webApp.themeParams);
    }

    const handlePointerDown = (event: Event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (!target.closest("button, a, [role='button'], summary")) {
        return;
      }

      webApp?.HapticFeedback?.impactOccurred?.("light");
      playUiClick();
    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return null;
}
