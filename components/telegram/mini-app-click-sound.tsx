"use client";

import { useEffect, useRef } from "react";

function createAudioContext() {
  const AudioCtx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  return AudioCtx ? new AudioCtx() : null;
}

function playClickTone(context: AudioContext) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(640, context.currentTime + 0.08);

  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.09, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.09);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.1);
}

export function MiniAppClickSound() {
  const contextRef = useRef<AudioContext | null>(null);
  const lastPlayedAtRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const unlock = async () => {
      if (!contextRef.current) {
        contextRef.current = createAudioContext();
      }

      if (contextRef.current?.state === "suspended") {
        await contextRef.current.resume();
      }
    };

    const handlePointerDown = async (event: Event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const clickable = target.closest(
        "button, a, input[type='button'], input[type='submit'], input[type='reset'], [role='button']"
      );

      if (!clickable) {
        return;
      }

      const disabled =
        clickable instanceof HTMLButtonElement ||
        clickable instanceof HTMLInputElement ||
        clickable instanceof HTMLSelectElement ||
        clickable instanceof HTMLTextAreaElement
          ? clickable.disabled
          : clickable.getAttribute("aria-disabled") === "true";

      if (disabled) {
        return;
      }

      await unlock();

      if (!contextRef.current) {
        return;
      }

      const now = window.performance.now();

      if (now - lastPlayedAtRef.current < 80) {
        return;
      }

      lastPlayedAtRef.current = now;
      playClickTone(contextRef.current);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, []);

  return null;
}
