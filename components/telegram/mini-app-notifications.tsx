"use client";

import Link from "next/link";
import { Route } from "next";
import { useEffect, useRef, useState } from "react";

type MembershipAlert = {
  kind: "expires_7_days" | "expires_3_days" | "access_disabled";
  title: string;
  message: string;
  daysLeft: number | null;
  expiresAt: string | null;
};

type NotificationStatus = {
  role: "admin" | "member";
  unreadChatCount: number;
  unreadPostCount: number;
  membershipAlert: MembershipAlert | null;
};

function playAlertTone() {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    const audioContext = new AudioContextCtor();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(520, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(760, audioContext.currentTime + 0.12);

    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.18);

    void audioContext.close().catch(() => undefined);
  } catch {
    return;
  }
}

function triggerHaptic() {
  const telegramWindow = window as typeof window & {
    Telegram?: {
      WebApp?: {
        HapticFeedback?: {
          impactOccurred?: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
        };
      };
    };
  };

  telegramWindow.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light");
}

function bannerClasses(kind: MembershipAlert["kind"] | "new_post") {
  if (kind === "access_disabled") {
    return "border-rose-300/18 bg-rose-500/8";
  }

  if (kind === "expires_3_days") {
    return "border-amber-300/18 bg-amber-500/8";
  }

  if (kind === "expires_7_days") {
    return "border-white/12 bg-white/[0.04]";
  }

  return "border-white/12 bg-white/[0.04]";
}

export function MiniAppNotifications() {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const previousSignature = useRef<string>("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/notifications/status", {
          cache: "no-store"
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as NotificationStatus;

        if (cancelled) {
          return;
        }

        const signature = `${payload.unreadPostCount}:${payload.membershipAlert?.kind ?? "none"}`;

        if (previousSignature.current && previousSignature.current !== signature) {
          playAlertTone();
          triggerHaptic();
        }

        previousSignature.current = signature;
        setStatus(payload);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    const intervalId = window.setInterval(() => void load(), 45000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  if (loading || !status || status.role !== "member") {
    return null;
  }

  const banners: Array<{
    key: string;
    href: Route;
    title: string;
    message: string;
    kind: MembershipAlert["kind"] | "new_post";
  }> = [];

  if (status.unreadPostCount > 0) {
    banners.push({
      key: "new-posts",
      href: "/tg/content",
      title: status.unreadPostCount === 1 ? "Новый пост уже в ленте" : `Новых постов: ${status.unreadPostCount}`,
      message: "Открой ленту, чтобы посмотреть свежие материалы своего уровня.",
      kind: "new_post"
    });
  }

  if (status.membershipAlert) {
    banners.push({
      key: status.membershipAlert.kind,
      href: "/tg/support",
      title: status.membershipAlert.title,
      message: status.membershipAlert.message,
      kind: status.membershipAlert.kind
    });
  }

  if (!banners.length) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      {banners.map((banner) => (
        <Link
          key={banner.key}
          href={banner.href}
          className={`block rounded-[20px] border px-4 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.12)] backdrop-blur-md transition hover:bg-white/[0.06] ${bannerClasses(
            banner.kind
          )}`}
        >
          <p className="text-sm font-semibold text-white">{banner.title}</p>
          <p className="mt-1 text-[13px] leading-5 text-white/62">{banner.message}</p>
        </Link>
      ))}
    </div>
  );
}
