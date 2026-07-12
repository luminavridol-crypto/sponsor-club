"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Tier } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  symbol: string;
  featured?: boolean;
  badgeKey?: "pendingRequestsCount" | "unreadChatCount" | "unreadContentCommentCount";
};

type AdminNotificationStatus = {
  role: "admin" | "member";
  unreadChatCount: number;
  pendingRequestsCount: number;
  unreadContentCommentCount: number;
  latestContentCommentAt?: string | null;
};

function isActive(pathname: string, searchParams: URLSearchParams, href: string) {
  const [baseHref, queryString] = href.split("?");
  const samePath = pathname === baseHref || pathname.startsWith(`${baseHref}/`);

  if (!samePath) {
    return false;
  }

  if (!queryString) {
    return true;
  }

  const expectedParams = new URLSearchParams(queryString);
  return Array.from(expectedParams.entries()).every(([key, value]) => searchParams.get(key) === value);
}

export function MiniAppNav({
  admin = false,
  hasAccess = false,
  tier = "tier_1"
}: {
  admin?: boolean;
  hasAccess?: boolean;
  tier?: Tier;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminStatus, setAdminStatus] = useState<AdminNotificationStatus | null>(null);
  const [commentToastVisible, setCommentToastVisible] = useState(false);
  const previousSignature = useRef<string>("");
  const previousLatestContentCommentAt = useRef<string | null>(null);

  useEffect(() => {
    if (!admin) {
      return;
    }

    let cancelled = false;

    const loadStatus = async () => {
      try {
        const response = await fetch("/api/notifications/status", {
          cache: "no-store"
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as AdminNotificationStatus;

        if (cancelled || payload.role !== "admin") {
          return;
        }

        const signature = `${payload.pendingRequestsCount}:${payload.unreadChatCount}:${payload.unreadContentCommentCount}`;
        const latestContentCommentAt = payload.latestContentCommentAt ?? null;

        if (previousSignature.current && previousSignature.current !== signature) {
          if (
            payload.unreadContentCommentCount > 0 &&
            latestContentCommentAt &&
            latestContentCommentAt !== previousLatestContentCommentAt.current
          ) {
            setCommentToastVisible(true);
          }

          setAdminStatus(payload);
        } else {
          setAdminStatus(payload);
        }

        previousSignature.current = signature;
        previousLatestContentCommentAt.current = latestContentCommentAt;
      } catch {
        return;
      }
    };

    void loadStatus();
    const intervalId = window.setInterval(() => void loadStatus(), 20000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [admin]);

  const items: NavItem[] = admin
    ? [
        { href: "/tg/content", label: "Лента", shortLabel: "Лента", symbol: "❖", badgeKey: "unreadContentCommentCount" },
        { href: "/tg/admin/calendar", label: "Календарь", shortLabel: "Календ.", symbol: "◈" },
        { href: "/tg/admin/posts", label: "Посты", shortLabel: "Посты", symbol: "✦" },
        { href: "/tg/admin/users", label: "Люди", shortLabel: "Люди", symbol: "♙", badgeKey: "pendingRequestsCount" },
        { href: "/tg/admin/chat", label: "Чат", shortLabel: "Чат", symbol: "◇", badgeKey: "unreadChatCount" },
        { href: "/tg/admin/invites", label: "Инвайты", shortLabel: "Коды", symbol: "⚿" },
        { href: "/tg/tiers", label: "Тарифы", shortLabel: "Тарифы", symbol: "♕" },
        { href: "/tg/admin/support", label: "Реквизиты", shortLabel: "Оплата", symbol: "◆" }
      ]
    : hasAccess
      ? [
          { href: "/tg/content", label: "Лента", shortLabel: "Лента", symbol: "❖" },
          { href: "/tg/tiers", label: "Уровни", shortLabel: "Уровни", symbol: "♕" },
          { href: "/tg/achievements", label: "Достижения", shortLabel: "Достиж.", symbol: "✦" },
          { href: "/tg/support", label: "Реквизиты", shortLabel: "Оплата", symbol: "◆" },
          { href: "/tg/chat", label: "Чат", shortLabel: "Чат", symbol: "◇" },
          { href: "/tg/profile", label: "Профиль", shortLabel: "Профиль", symbol: "☾" }
        ]
      : [
          { href: "/tg/content", label: "Лента", shortLabel: "Лента", symbol: "❖", featured: true },
          { href: "/tg/tiers", label: "Уровни", shortLabel: "Уровни", symbol: "♕", featured: true },
          { href: "/tg/support", label: "Реквизиты", shortLabel: "Оплата", symbol: "◆" }
        ];

  return (
    <>
      <button
        data-club-tier={tier}
        type="button"
        aria-label={mobileOpen ? "Скрыть меню" : "Открыть меню"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((value) => !value)}
        className="club-nav-toggle fixed left-3 top-4 z-[70] inline-flex h-11 w-11 items-center justify-center text-white backdrop-blur-xl transition lg:hidden"
      >
        <span className="sr-only">{mobileOpen ? "Скрыть меню" : "Открыть меню"}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          {mobileOpen ? (
            <>
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </>
          ) : (
            <>
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </>
          )}
        </svg>
      </button>

      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition duration-300 lg:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      <nav
        data-club-tier={tier}
        className={`fixed left-0 top-0 z-50 h-full w-[112px] px-3 py-20 transition-transform duration-300 lg:left-3 lg:top-1/2 lg:h-auto lg:w-[92px] lg:-translate-y-1/2 lg:px-0 lg:py-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-[110%]"
        } lg:translate-x-0`}
      >
        <div className="club-nav-frame p-2 backdrop-blur-xl">
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const active = isActive(pathname, searchParams, item.href);
              const featured = Boolean(item.featured);
              const badgeCount = item.badgeKey && adminStatus ? adminStatus[item.badgeKey] : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href as never}
                  title={item.label}
                  onClick={() => setMobileOpen(false)}
                  className={`club-nav-item relative px-3 py-3 text-center text-[12px] font-medium leading-4 transition lg:text-[11px] ${
                    active
                      ? "club-nav-item-active"
                      : featured
                        ? "border border-white/16 bg-white/[0.05] text-white"
                        : "border border-white/10 bg-white/[0.03] text-white/68 hover:border-white/18 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span className="club-nav-symbol" aria-hidden="true">{item.symbol}</span>
                  <span className="club-nav-label">{item.shortLabel}</span>
                  {badgeCount ? (
                    <span className="absolute right-1.5 top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-rose-200/30 bg-rose-500 px-1.5 text-[10px] font-semibold leading-none text-white shadow-[0_0_14px_rgba(244,63,94,0.55)]">
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {admin && commentToastVisible && adminStatus?.unreadContentCommentCount ? (
        <div className="fixed bottom-5 left-1/2 z-[80] w-[min(calc(100vw-1.5rem),420px)] -translate-x-1/2 lg:bottom-7">
          <div className="rounded-[24px] border border-fuchsia-200/20 bg-[#16131f]/95 p-3 shadow-[0_20px_54px_rgba(0,0,0,0.42)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Link
                href="/tg/content?comments=1"
                onClick={() => setCommentToastVisible(false)}
                className="min-w-0 flex-1"
              >
                <p className="text-[11px] uppercase tracking-[0.2em] text-fuchsia-100/55">Новый комментарий</p>
                <p className="mt-1 text-sm font-medium text-white">
                  Открыть последние комментарии
                </p>
              </Link>
              <button
                type="button"
                aria-label="Скрыть уведомление"
                onClick={() => setCommentToastVisible(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/55 transition hover:bg-white/[0.08] hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
