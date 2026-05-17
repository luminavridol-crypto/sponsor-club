import { ReactNode } from "react";
import { signOutAction } from "@/app/actions";
import { MiniAppNav } from "@/components/telegram/mini-app-nav";
import { TelegramMiniAppBridge } from "@/components/telegram/telegram-mini-app-bridge";
import { Profile } from "@/lib/types";

export function MiniAppShell({
  profile,
  title,
  subtitle,
  children
}: {
  profile: Profile;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const name =
    profile.display_name ||
    profile.telegram_first_name ||
    profile.telegram_username ||
    "Lumina member";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,79,216,0.16),transparent_28%),radial-gradient(circle_at_bottom,rgba(101,191,255,0.12),transparent_26%),#05060d] pb-28 text-white">
      <TelegramMiniAppBridge />
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-6 pt-4">
        <header className="rounded-[28px] border border-white/10 bg-white/5 px-4 py-4 shadow-glow">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.26em] text-accentSoft">Lumina Club</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">{title}</h1>
              {subtitle ? <p className="mt-2 text-sm text-white/58">{subtitle}</p> : null}
            </div>
            <form action={signOutAction}>
              <button className="rounded-2xl border border-white/10 bg-black/15 px-3 py-2 text-xs text-white/70 transition hover:border-accent/35 hover:text-white">
                Выйти
              </button>
            </form>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.22em] text-white/35">Профиль</p>
            <p className="mt-1 truncate text-sm font-medium text-white">{name}</p>
          </div>
        </header>

        <main className="mt-4 flex-1 space-y-4">{children}</main>
      </div>

      <MiniAppNav admin={profile.role === "admin"} />
    </div>
  );
}
