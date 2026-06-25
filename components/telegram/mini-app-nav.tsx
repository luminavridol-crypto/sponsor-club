"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  featured?: boolean;
  badgeKey?: "pendingRequestsCount" | "unreadChatCount" | "unreadContentCommentCount";
};

type AdminNotificationStatus = {
  role: "admin" | "member";
  unreadChatCount: number;
  pendingRequestsCount: number;
  unreadContentCommentCount: number;
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
  hasAccess = false
}: {
  admin?: boolean;
  hasAccess?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminStatus, setAdminStatus] = useState<AdminNotificationStatus | null>(null);
  const previousSignature = useRef<string>("");

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

        if (previousSignature.current && previousSignature.current !== signature) {
          setAdminStatus(payload);
        } else {
          setAdminStatus(payload);
        }

        previousSignature.current = signature;
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
        { href: "/tg/content", label: "Лента", shortLabel: "Лента", badgeKey: "unreadContentCommentCount" },
        { href: "/tg/admin/calendar", label: "Календарь", shortLabel: "Календ." },
        { href: "/tg/admin/posts", label: "Посты", shortLabel: "Посты" },
        { href: "/tg/admin/users", label: "Люди", shortLabel: "Люди", badgeKey: "pendingRequestsCount" },
        { href: "/tg/admin/chat", label: "Чат", shortLabel: "Чат", badgeKey: "unreadChatCount" },
        { href: "/tg/admin/invites", label: "Инвайты", shortLabel: "Коды" },
        { href: "/tg/tiers", label: "Тарифы", shortLabel: "Тарифы" },
        { href: "/tg/admin/support", label: "Реквизиты", shortLabel: "Оплата" }
      ]
    : hasAccess
      ? [
          { href: "/tg/content", label: "Лента", shortLabel: "Лента" },
          { href: "/tg/tiers", label: "Уровни", shortLabel: "Уровни" },
          { href: "/tg/achievements", label: "Достижения", shortLabel: "Достиж." },
          { href: "/tg/support", label: "Реквизиты", shortLabel: "Оплата" },
          { href: "/tg/chat", label: "Чат", shortLabel: "Чат" },
          { href: "/tg/profile", label: "Профиль", shortLabel: "Профиль" }
        ]
      : [
          { href: "/tg/content", label: "Лента", shortLabel: "Лента", featured: true },
          { href: "/tg/tiers", label: "Уровни", shortLabel: "Уровни", featured: true },
          { href: "/tg/support", label: "Реквизиты", shortLabel: "Оплата" }
        ];

  return (
    <>
      <button
        type="button"
        aria-label={mobileOpen ? "Скрыть меню" : "Открыть меню"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((value) => !value)}
        className="fixed left-3 top-4 z-[70] inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-[#161720]/92 text-white shadow-[0_14px_40px_rgba(0,0,0,0.38)] backdrop-blur-xl transition hover:border-white/18 lg:hidden"
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
        className={`fixed left-0 top-0 z-50 h-full w-[112px] px-3 py-20 transition-transform duration-300 lg:left-3 lg:top-1/2 lg:h-auto lg:w-[92px] lg:-translate-y-1/2 lg:px-0 lg:py-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-[110%]"
        } lg:translate-x-0`}
      >
        <div className="rounded-[28px] border border-white/10 bg-[#14141c]/96 p-2 shadow-[0_18px_46px_rgba(0,0,0,0.34)] backdrop-blur-xl">
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
                  className={`relative rounded-[20px] px-3 py-3 text-center text-[12px] font-medium leading-4 transition lg:text-[11px] ${
                    active
                      ? "bg-white text-slate-950 shadow-[0_8px_24px_rgba(255,255,255,0.16)]"
                      : featured
                        ? "border border-white/16 bg-white/[0.05] text-white"
                        : "border border-white/10 bg-white/[0.03] text-white/68 hover:border-white/18 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {item.shortLabel}
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
    </>
  );
}
