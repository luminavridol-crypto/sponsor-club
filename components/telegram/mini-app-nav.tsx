"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  featured?: boolean;
};

function isActive(pathname: string, searchParams: URLSearchParams, href: string) {
  const [baseHref, queryString] = href.split("?");
  const samePath = pathname === baseHref || pathname.startsWith(`${baseHref}/`);

  if (!samePath) {
    return false;
  }

  if (!queryString) {
    if (baseHref === "/tg/support") {
      return searchParams.get("mode") !== "chat";
    }

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

  const items: NavItem[] = admin
    ? [
        { href: "/tg/admin/calendar", label: "Календарь", shortLabel: "Календ." },
        { href: "/tg/admin/posts", label: "Посты", shortLabel: "Посты" },
        { href: "/tg/admin/users", label: "Люди", shortLabel: "Люди" },
        { href: "/tg/admin/chat", label: "Чат", shortLabel: "Чат" },
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
          { href: "/tg/support?mode=chat", label: "Чат", shortLabel: "Чат" },
          { href: "/tg/profile", label: "Профиль", shortLabel: "Профиль" }
        ]
      : [
          { href: "/tg/tiers", label: "Уровни", shortLabel: "Уровни", featured: true },
          { href: "/tg/support", label: "Реквизиты", shortLabel: "Оплата" }
        ];

  return (
    <nav className="fixed left-3 top-1/2 z-40 w-[92px] -translate-y-1/2">
      <div className="rounded-[28px] border border-white/10 bg-[#14141c]/92 p-2 shadow-[0_18px_46px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const active = isActive(pathname, searchParams, item.href);
            const featured = Boolean(item.featured);

            return (
              <Link
                key={item.href}
                href={item.href as never}
                title={item.label}
                className={`rounded-[20px] px-3 py-3 text-center text-[11px] font-medium leading-4 transition ${
                  active
                    ? "bg-white text-slate-950 shadow-[0_8px_24px_rgba(255,255,255,0.16)]"
                    : featured
                      ? "border border-white/16 bg-white/[0.05] text-white"
                      : "border border-white/10 bg-white/[0.03] text-white/68 hover:border-white/18 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {item.shortLabel}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
