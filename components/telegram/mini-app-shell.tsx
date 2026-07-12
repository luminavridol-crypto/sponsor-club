import { ReactNode } from "react";
import Image from "next/image";
import { signOutTelegramAction } from "@/app/tg/actions";
import { ClearAppCacheButton } from "@/components/telegram/clear-app-cache-button";
import { MiniAppNav } from "@/components/telegram/mini-app-nav";
import { MiniAppNotifications } from "@/components/telegram/mini-app-notifications";
import { TelegramMiniAppBridge } from "@/components/telegram/telegram-mini-app-bridge";
import { hasClubAccess } from "@/lib/auth/access";
import { Profile } from "@/lib/types";
import { TIER_EMBLEMS } from "@/lib/ui/tier-emblems";
import { getEffectiveTier } from "@/lib/utils/tier";

export function MiniAppShell({
  profile,
  title,
  children,
  shellClassName,
  headerClassName,
  eyebrowClassName,
  showHeaderActions = true,
  hasAccess
}: {
  profile: Profile;
  title: string;
  children: ReactNode;
  shellClassName?: string;
  headerClassName?: string;
  eyebrowClassName?: string;
  showHeaderActions?: boolean;
  hasAccess?: boolean;
}) {
  const effectiveTier = getEffectiveTier(profile);
  return (
    <div
      data-club-tier={effectiveTier}
      className={`club-theme min-h-screen text-white lg:pl-[108px] ${shellClassName ?? ""}`}
    >
      <TelegramMiniAppBridge />
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 pb-24 pt-16 sm:px-4 sm:pb-24 sm:pt-3 lg:pb-6">
        <header
          className={`club-frame club-header px-4 py-4 backdrop-blur-md ${headerClassName ?? ""}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="club-header-emblem shrink-0" aria-hidden="true">
                <Image src={TIER_EMBLEMS[effectiveTier]} alt="" width={96} height={96} className="h-full w-full rounded-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className={`club-eyebrow text-[10px] uppercase tracking-[0.2em] ${eyebrowClassName ?? ""}`}>Lumina Club</p>
                <h1 className="club-title mt-1.5 break-words font-display text-[1.7rem] font-semibold leading-none sm:text-[1.9rem]">
                  {title}
                </h1>
              </div>
            </div>
            {showHeaderActions ? (
              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                <ClearAppCacheButton />
                <form action={signOutTelegramAction}>
                  <button className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70 transition hover:border-white/16 hover:text-white">
                    Выйти
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </header>

        <main className="mt-3 flex-1 space-y-3">
          <MiniAppNotifications />
          {children}
        </main>
      </div>

      <MiniAppNav admin={profile.role === "admin"} hasAccess={hasAccess ?? hasClubAccess(profile)} tier={effectiveTier} />
    </div>
  );
}
