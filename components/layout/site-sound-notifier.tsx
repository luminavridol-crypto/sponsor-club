"use client";

import { useEffect, useRef } from "react";

type NotificationStatus = {
  role: "admin" | "member";
  unreadChatCount: number;
  pendingRequestsCount: number;
  unreadContentCommentCount: number;
  latestUnreadChatAt: string | null;
  latestPendingRequestAt: string | null;
  latestContentCommentAt: string | null;
};

function useAudioUnlock() {
  const contextRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const ensureUnlocked = async () => {
      if (unlockedRef.current) {
        return;
      }

      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtx) {
        return;
      }

      if (!contextRef.current) {
        contextRef.current = new AudioCtx();
      }

      if (contextRef.current.state === "suspended") {
        await contextRef.current.resume();
      }

      unlockedRef.current = true;
    };

    const events: Array<keyof WindowEventMap> = ["click", "keydown", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, ensureUnlocked, { passive: true }));

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, ensureUnlocked));
    };
  }, []);

  return { contextRef, unlockedRef };
}

function playNotificationBeep(context: AudioContext) {
  const firstOscillator = context.createOscillator();
  const firstGain = context.createGain();
  const secondOscillator = context.createOscillator();
  const secondGain = context.createGain();
  const thirdOscillator = context.createOscillator();
  const thirdGain = context.createGain();

  firstOscillator.type = "triangle";
  firstOscillator.frequency.setValueAtTime(920, context.currentTime);
  firstOscillator.frequency.exponentialRampToValueAtTime(700, context.currentTime + 0.18);

  firstGain.gain.setValueAtTime(0.0001, context.currentTime);
  firstGain.gain.exponentialRampToValueAtTime(0.24, context.currentTime + 0.02);
  firstGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24);

  secondOscillator.type = "triangle";
  secondOscillator.frequency.setValueAtTime(1180, context.currentTime + 0.24);
  secondOscillator.frequency.exponentialRampToValueAtTime(900, context.currentTime + 0.42);

  secondGain.gain.setValueAtTime(0.0001, context.currentTime + 0.22);
  secondGain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.27);
  secondGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.48);

  thirdOscillator.type = "sine";
  thirdOscillator.frequency.setValueAtTime(1320, context.currentTime + 0.5);
  thirdOscillator.frequency.exponentialRampToValueAtTime(980, context.currentTime + 0.68);

  thirdGain.gain.setValueAtTime(0.0001, context.currentTime + 0.48);
  thirdGain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.54);
  thirdGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.74);

  firstOscillator.connect(firstGain);
  firstGain.connect(context.destination);
  secondOscillator.connect(secondGain);
  secondGain.connect(context.destination);
  thirdOscillator.connect(thirdGain);
  thirdGain.connect(context.destination);

  firstOscillator.start();
  firstOscillator.stop(context.currentTime + 0.26);
  secondOscillator.start(context.currentTime + 0.24);
  secondOscillator.stop(context.currentTime + 0.5);
  thirdOscillator.start(context.currentTime + 0.5);
  thirdOscillator.stop(context.currentTime + 0.76);
}

export function SiteSoundNotifier({
  admin,
  initialUnreadChatCount,
  initialPendingRequestsCount = 0,
  initialLatestUnreadChatAt = null,
  initialLatestPendingRequestAt = null,
  initialLatestContentCommentAt = null
}: {
  admin?: boolean;
  initialUnreadChatCount: number;
  initialPendingRequestsCount?: number;
  initialLatestUnreadChatAt?: string | null;
  initialLatestPendingRequestAt?: string | null;
  initialLatestContentCommentAt?: string | null;
}) {
  const previousRef = useRef({
    unreadChatCount: initialUnreadChatCount,
    pendingRequestsCount: initialPendingRequestsCount,
    unreadContentCommentCount: 0,
    latestUnreadChatAt: initialLatestUnreadChatAt,
    latestPendingRequestAt: initialLatestPendingRequestAt,
    latestContentCommentAt: initialLatestContentCommentAt
  });
  const { contextRef, unlockedRef } = useAudioUnlock();

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch("/api/notifications/status", {
          method: "GET",
          cache: "no-store"
        });

        if (!response.ok) {
          return;
        }

        const next = (await response.json()) as NotificationStatus;

        if (cancelled) {
          return;
        }

        const previous = previousRef.current;
        const hasNewUnreadChat =
          Boolean(next.latestUnreadChatAt) &&
          next.latestUnreadChatAt !== previous.latestUnreadChatAt;
        const hasNewPendingRequest =
          Boolean(next.latestPendingRequestAt) &&
          next.latestPendingRequestAt !== previous.latestPendingRequestAt;
        const hasNewContentComment =
          Boolean(next.latestContentCommentAt) &&
          next.latestContentCommentAt !== previous.latestContentCommentAt;
        const hasNewAdminEvent =
          admin && (hasNewUnreadChat || hasNewPendingRequest || hasNewContentComment);
        const hasNewMemberEvent = !admin && hasNewUnreadChat;

        if ((hasNewAdminEvent || hasNewMemberEvent) && unlockedRef.current && contextRef.current) {
          if (contextRef.current.state === "suspended") {
            await contextRef.current.resume();
          }
          playNotificationBeep(contextRef.current);
        }

        previousRef.current = {
          unreadChatCount: next.unreadChatCount,
          pendingRequestsCount: next.pendingRequestsCount,
          unreadContentCommentCount: next.unreadContentCommentCount,
          latestUnreadChatAt: next.latestUnreadChatAt,
          latestPendingRequestAt: next.latestPendingRequestAt,
          latestContentCommentAt: next.latestContentCommentAt
        };
      } catch {
        // Не мешаем работе интерфейса, если опрос временно недоступен.
      }
    };

    poll();
    const interval = window.setInterval(poll, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [admin, contextRef, unlockedRef]);

  return null;
}
