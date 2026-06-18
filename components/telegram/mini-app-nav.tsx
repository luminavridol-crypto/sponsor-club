"use client";

import Link from "next/link";
import { Route } from "next";
import { usePathname } from "next/navigation";

type NavItem = {
  href: Route;
  label: string;
  featured?: boolean;
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MiniAppNav({
  admin = false,
  hasAccess = false
}: {
  admin?: boolean;
  hasAccess?: boolean;
}) {
  const pathname = usePathname();

  const items: NavItem[] = admin
    ? [
        { href: "/tg/admin/posts", label: "Посты" },
        { href: "/tg/admin/users", label: "Люди" },
        { href: "/tg/content", label: "Лента" },
        { href: "/tg/admin/invites", label: "Инвайты" },
        { href: "/tg/tiers", label: "Тарифы" }
      ]
    : hasAccess
      ? [
          { href: "/tg/content", label: "Лента" },
          { href: "/tg/tiers", label: "Уровни" },
          { href: "/tg/support", label: "Чат" },
          { href: "/tg/profile", label: "Профиль" }
        ]
      : [
          { href: "/tg/tiers", label: "Уровни", featured: true }
        ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#14141c]/94 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.65rem)] pt-3 backdrop-blur-md">
      <div className="mx-auto max-w-xl overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-full gap-2">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const featured = Boolean(item.featured);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-w-[108px] shrink-0 rounded-2xl px-3 py-3 text-center text-xs font-medium transition ${
                  active
                    ? "bg-white text-slate-950"
                    : featured
                      ? "border border-white/16 bg-white/[0.05] text-white"
                      : "border border-white/10 bg-white/[0.03] text-white/65"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
