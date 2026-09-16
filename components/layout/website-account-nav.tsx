import Link from "next/link";
import type { Route } from "next";
import { websiteSignOutAction } from "@/app/actions";
import type { Profile } from "@/lib/types";
import type { Subscription } from "@/lib/data/subscriptions";
import { subscriptionHasAccess, tierNumberToName } from "@/lib/data/subscriptions";

const LABELS = { tier_1: "Sputnik", tier_2: "Insider", tier_3: "VIP", tier_4: "After Dark" } as const;

function UserIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.5" /><path d="M4.8 20c.8-4 3.2-6 7.2-6s6.4 2 7.2 6" /></svg>;
}

export function WebsiteAccountNav({ profile, subscription }: { profile: Profile | null; subscription: Subscription | null }) {
  if (!profile) {
    return <div className="flex w-full justify-end"><Link href={"/login" as Route} title="Войти" aria-label="Войти" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 text-sm text-white/78 transition hover:border-accent/40 hover:bg-accent/10 hover:text-white sm:px-4"><UserIcon /><span className="hidden sm:inline">Войти</span></Link></div>;
  }
  const effectiveTier = profile.role === "admin" ? "tier_4" : subscriptionHasAccess(subscription) ? tierNumberToName(subscription?.tier ?? 0) : null;
  const label = effectiveTier ? LABELS[effectiveTier] : null;
  return (
    <details className="group relative ml-auto">
      <summary title="Личный кабинет" aria-label="Личный кабинет" className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 text-sm text-white/80 transition hover:border-accent/40 hover:bg-accent/10 hover:text-white [&::-webkit-details-marker]:hidden sm:px-4">
        <UserIcon />
        <span className="hidden sm:inline">Личный кабинет</span>
        {label ? <span className="hidden rounded-full border border-accentSoft/25 bg-accent/12 px-2 py-0.5 text-[10px] font-semibold text-accentSoft sm:inline-flex">{label}</span> : null}
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-56 rounded-[20px] border border-white/12 bg-[#100b18]/95 p-2 shadow-[0_22px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <Link href={"/account" as Route} className="block rounded-xl px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.07] hover:text-white">Личный кабинет</Link>
        <Link href={"/account#subscription" as Route} className="block rounded-xl px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.07] hover:text-white">Моя подписка</Link>
        <Link href={"/tg/content" as Route} className="block rounded-xl px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.07] hover:text-white">Закрытый контент</Link>
        <form action={websiteSignOutAction}><button type="submit" className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-rose-100/80 hover:bg-rose-400/10 hover:text-rose-100">Выйти</button></form>
      </div>
    </details>
  );
}
