"use client";

import Link from "next/link";
import { Route } from "next";
import { usePathname } from "next/navigation";
import { Profile } from "@/lib/types";

type NavAccent = "neutral" | "cyan" | "accent";
type UnreadKind = "chat" | "content";
type AdminNoticeKind = "chat" | "requests";

type NavLink = {
  href: Route;
  label: string;
  accent: NavAccent;
  match?: "exact" | "startsWith";
  unreadKind?: UnreadKind;
  adminNoticeKind?: AdminNoticeKind;
};

const memberLinks: NavLink[] = [
  { href: "/profile", label: "Профиль", accent: "neutral", match: "startsWith" },
  { href: "/feed", label: "Контент", accent: "neutral", match: "startsWith", unreadKind: "content" },
  { href: "/chat", label: "Чат", accent: "neutral", match: "startsWith", unreadKind: "chat" }
];

const adminLinks: NavLink[] = [
  { href: "/admin/creator", label: "Creator Studio", accent: "cyan", match: "startsWith" },
  { href: "/admin/posts", label: "Добавить пост", accent: "cyan", match: "startsWith" },
  { href: "/dashboard", label: "Аналитика", accent: "neutral", match: "exact" },
  { href: "/admin/users", label: "Пользователи", accent: "neutral", match: "startsWith" },
  { href: "/admin", label: "Админ-панель", accent: "accent", match: "startsWith" },
  { href: "/admin/requests", label: "Заявки", accent: "accent", match: "startsWith", adminNoticeKind: "requests" },
  { href: "/feed", label: "Контент", accent: "neutral", match: "startsWith" },
  { href: "/profile", label: "Профиль", accent: "neutral", match: "startsWith" },
  { href: "/admin/chat", label: "Чат", accent: "neutral", match: "startsWith", unreadKind: "chat" }
];

function isLinkActive(pathname: string, link: NavLink) {
  if (link.href === "/admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/invites");
  }

  if (link.match === "startsWith") {
    return pathname === link.href || pathname.startsWith(`${link.href}/`);
  }

  return pathname === link.href;
}

function linkClass(accent: NavAccent, active: boolean) {
  const base = "block rounded-2xl border px-4 py-3 text-sm transition";

  if (active) {
    if (accent === "cyan") {
      return `${base} border-cyanGlow/50 bg-cyanGlow/20 text-cyanGlow shadow-[0_0_30px_rgba(111,234,255,0.15)]`;
    }

    if (accent === "accent") {
      return `${base} border-accent/45 bg-accent/20 text-accentSoft shadow-[0_0_30px_rgba(255,92,208,0.14)]`;
    }

    return `${base} border-white/20 bg-white/10 text-white`;
  }

  if (accent === "cyan") {
    return `${base} border-cyanGlow/30 bg-cyanGlow/10 text-cyanGlow hover:bg-cyanGlow/20`;
  }

  if (accent === "accent") {
    return `${base} border-accent/30 bg-accent/10 text-accentSoft hover:bg-accent/20`;
  }

  return `${base} border-white/10 text-white/75 hover:border-accent/50 hover:bg-white/5 hover:text-white`;
}

export function PrivateNav({
  profile,
  admin,
  hasUnreadChat = false,
  hasUnreadContent = false,
  hasPendingRequests = false
}: {
  profile: Profile;
  admin?: boolean;
  hasUnreadChat?: boolean;
  hasUnreadContent?: boolean;
  hasPendingRequests?: boolean;
}) {
  const pathname = usePathname();
  const links = admin ? adminLinks : memberLinks;

  return (
    <aside className="h-fit rounded-3xl border border-white/10 bg-white/5 p-4 shadow-cyan lg:sticky lg:top-0 lg:p-5">
      <div className="mb-6 rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">
          {admin ? "Приватный клуб" : "Ваш раздел"}
        </p>
        <p className="mt-2 text-2xl font-semibold text-white">Lumina</p>
        <p className="mt-2 break-words text-sm text-white/55">
          {admin ? "Закрытое пространство автора" : profile.display_name || profile.email}
        </p>
      </div>

      <nav className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {links.map((link) => {
          const active = isLinkActive(pathname, link);
          const showUnread =
            (link.unreadKind === "chat" && hasUnreadChat) ||
            (link.unreadKind === "content" && hasUnreadContent) ||
            (link.adminNoticeKind === "requests" && hasPendingRequests);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`${linkClass(link.accent, active)} flex items-center justify-between gap-3`}
            >
              <span>{link.label}</span>
              {showUnread ? (
                <span className="inline-flex h-3 w-3 shrink-0 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.7)]" />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
