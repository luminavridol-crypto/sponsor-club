import Link from "next/link";
import { Route } from "next";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { requireAdmin } from "@/lib/auth/guards";

const adminCards = [
  {
    href: "/tg/admin/donations",
    title: "Донаты",
    text: "Подтверждать заявки и выдавать доступ."
  },
  {
    href: "/admin/users",
    title: "Пользователи",
    text: "Менять роли, сроки доступа и профили."
  },
  {
    href: "/admin/posts",
    title: "Контент",
    text: "Публиковать и редактировать материалы."
  },
  {
    href: "/admin/chat",
    title: "Чат",
    text: "Отвечать участникам клуба."
  }
] satisfies Array<{ href: Route; title: string; text: string }>;

export default async function TelegramAdminPage() {
  const profile = await requireAdmin();

  return (
    <MiniAppShell profile={profile} title="Админ" subtitle="Быстрый вход в админ-раздел прямо из Telegram.">
      {adminCards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="block rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-glow transition hover:border-accent/35"
        >
          <p className="text-xs uppercase tracking-[0.24em] text-accentSoft">{card.title}</p>
          <p className="mt-3 text-lg font-semibold text-white">{card.title}</p>
          <p className="mt-2 text-sm leading-6 text-white/62">{card.text}</p>
        </Link>
      ))}
    </MiniAppShell>
  );
}
