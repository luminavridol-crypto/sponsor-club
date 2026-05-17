"use client";

import Link from "next/link";
import { Route } from "next";
import { usePathname } from "next/navigation";

type NavItem = {
  href: Route;
  label: string;
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MiniAppNav({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  const items: NavItem[] = [
    { href: "/tg/content", label: "Контент" },
    { href: "/tg/support", label: "Поддержать" },
    { href: "/tg/profile", label: "Профиль" }
  ];

  if (admin) {
    items.push({ href: "/tg/admin", label: "Админ" });
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#090b14]/96 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.65rem)] pt-3 backdrop-blur-xl">
      <div className={`mx-auto grid max-w-xl gap-2 ${admin ? "grid-cols-4" : "grid-cols-3"}`}>
        {items.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-3 py-3 text-center text-xs font-medium transition ${
                active
                  ? "bg-gradient-to-r from-accent/80 to-[#7d52ff] text-white shadow-glow"
                  : "border border-white/10 bg-white/[0.04] text-white/65"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
