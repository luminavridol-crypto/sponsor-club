import { ReactNode } from "react";
import { signOutTelegramAction } from "@/app/tg/actions";
import { ClearAppCacheButton } from "@/components/telegram/clear-app-cache-button";
import { MiniAppNav } from "@/components/telegram/mini-app-nav";
import { MiniAppNotifications } from "@/components/telegram/mini-app-notifications";
import { TelegramMiniAppBridge } from "@/components/telegram/telegram-mini-app-bridge";
import { hasClubAccess } from "@/lib/auth/access";
import { Profile } from "@/lib/types";

export function MiniAppShell({
  profile,
  title,
  children,
  shellClassName,
  headerClassName,
  eyebrowClassName
}: {
  profile: Profile;
  title: string;
  children: ReactNode;
  shellClassName?: string;
  headerClassName?: string;
  eyebrowClassName?: string;
}) {
  return (
    <div className={`min-h-screen bg-[linear-gradient(180deg,#17151d_0%,#111119_42%,#0c0d13_100%)] pb-28 text-white ${shellClassName ?? ""}`}>
      <TelegramMiniAppBridge />
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-6 pt-3">
        <header
          className={`rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(34,31,44,0.96),rgba(24,22,32,0.94))] px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.16)] backdrop-blur-md ${headerClassName ?? ""}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-[10px] uppercase tracking-[0.2em] text-white/55 ${eyebrowClassName ?? ""}`}>Lumina Club</p>
              <h1 className="font-display mt-1.5 text-[1.7rem] font-semibold leading-none text-white sm:text-[1.9rem]">
                {title}
              </h1>
            </div>
            <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
              <ClearAppCacheButton />
              <form action={signOutTelegramAction}>
                <button className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70 transition hover:border-white/16 hover:text-white">
                  Выйти
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="mt-3 flex-1 space-y-3">
          <MiniAppNotifications />
          {children}
        </main>
      </div>

      <MiniAppNav admin={profile.role === "admin"} hasAccess={hasClubAccess(profile)} />
    </div>
  );
}
