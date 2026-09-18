"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { websiteSignOutAction } from "@/app/actions";
import type { Locale } from "@/lib/i18n/config";
import { intlLocale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";

type Subscription = { tier: number; status: string; started_at: string | null; expires_at: string | null } | null;
type MePayload = { user: { display_name: string | null; email: string | null; avatar_url: string | null; telegram_username: string | null; telegram_id: string | null }; subscription: Subscription; tier: number; tier_name: string; expires_at: string | null };
type SubscriptionPayload = { subscription: Subscription; current_tier: number; current_tier_name: string; has_access: boolean };
const TIER_NAMES = ["Guest", "Sputnik", "Insider", "VIP", "After Dark"];
function formatDate(value: string | null | undefined, locale: Locale, fallback: string) {
  return value ? new Intl.DateTimeFormat(intlLocale(locale), { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value)) : fallback;
}

export function AccountOverview({ telegramLink, locale, copy, common }: { telegramLink: string; locale: Locale; copy: Messages["account"]; common: Messages["common"] }) {
  const [data, setData] = useState<{ me: MePayload; subscription: SubscriptionPayload } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/me", { cache: "no-store" }), fetch("/api/subscription", { cache: "no-store" })])
      .then(async ([meResponse, subscriptionResponse]) => {
        if (!meResponse.ok || !subscriptionResponse.ok) throw new Error("Unauthorized");
        const [me, subscription] = await Promise.all([meResponse.json() as Promise<MePayload>, subscriptionResponse.json() as Promise<SubscriptionPayload>]);
        if (active) setData({ me, subscription });
      })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);

  if (error) return <section className="rounded-[28px] border border-rose-300/15 bg-rose-400/8 p-5 text-rose-100">{copy.loadError}</section>;
  if (!data) return <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-sm text-white/55">{copy.loading}</section>;
  const { me, subscription } = data;
  const tier = subscription.current_tier;
  const tierName = TIER_NAMES[tier] ?? me.tier_name;
  const telegramConnected = Boolean(me.user.telegram_id);

  return <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
    <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-glow sm:p-6">
      <div className="flex items-center gap-4">
        <div role="img" aria-label={`${copy.profile}: ${me.user.display_name || copy.memberAvatar}`} className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-white/12 bg-cover bg-center text-2xl font-semibold text-white" style={me.user.avatar_url ? { backgroundImage: `url(${JSON.stringify(me.user.avatar_url).slice(1, -1)})` } : undefined}>{me.user.avatar_url ? null : (me.user.display_name || me.user.email || "L").slice(0, 1).toUpperCase()}</div>
        <div className="min-w-0"><p className="text-xs uppercase tracking-[0.24em] text-accentSoft">{copy.profile}</p><h1 className="font-display mt-2 truncate text-2xl text-white">{me.user.display_name || copy.member}</h1><p className="mt-1 truncate text-sm text-white/50">{me.user.email || copy.emailMissing}</p></div>
      </div>
      <div className="mt-5 rounded-[20px] border border-white/8 bg-black/15 p-4 text-sm text-white/65">{telegramConnected ? <><p className="font-medium text-white">{copy.telegramConnected}</p><p className="mt-1">{me.user.telegram_username ? `@${me.user.telegram_username.replace(/^@/, "")}` : copy.accountConfirmed}</p></> : <><p>{copy.telegramMissing}</p><a href={telegramLink} className="mt-3 inline-flex text-accentSoft hover:text-white">{copy.connectTelegram}</a></>}</div>
    </section>
    <section id="subscription" className="scroll-mt-6 rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(255,79,216,0.14),transparent_34%),rgba(255,255,255,0.04)] p-5 shadow-glow sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.24em] text-accentSoft">{copy.mySubscription}</p><h2 className="font-display mt-2 text-3xl text-white">{tierName}</h2></div>{tier > 0 ? <span className="rounded-full border border-accentSoft/25 bg-accent/12 px-3 py-1 text-xs font-semibold text-accentSoft">{tierName}</span> : null}</div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/8 bg-black/15 p-4"><dt className="text-xs uppercase tracking-wider text-white/38">{copy.status}</dt><dd className="mt-2 text-sm font-medium text-white">{subscription.subscription ? copy.statuses[subscription.subscription.status as keyof typeof copy.statuses] ?? subscription.subscription.status : copy.noSubscription}</dd></div><div className="rounded-2xl border border-white/8 bg-black/15 p-4"><dt className="text-xs uppercase tracking-wider text-white/38">{copy.startedAt}</dt><dd className="mt-2 text-sm font-medium text-white">{formatDate(subscription.subscription?.started_at, locale, common.notSpecified)}</dd></div><div className="rounded-2xl border border-white/8 bg-black/15 p-4 sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-white/38">{copy.expiresAt}</dt><dd className="mt-2 text-sm font-medium text-white">{formatDate(subscription.subscription?.expires_at, locale, common.notSpecified)}</dd></div></dl>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link href={(subscription.has_access ? "/tg/content" : "/request-access") as Route} className="inline-flex items-center justify-center rounded-2xl border border-accent/35 bg-accent/12 px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/20">{subscription.has_access ? copy.openContent : copy.chooseSubscription}</Link>
        {tier > 0 && tier < 4 ? <Link href={"/request-access" as Route} className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.09]">{copy.upgrade}</Link> : null}
        <Link href={"/request-access" as Route} className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm text-white/78 transition hover:text-white">{copy.manage}</Link>
        <form action={websiteSignOutAction}><button type="submit" className="w-full rounded-2xl border border-rose-200/14 bg-rose-400/8 px-4 py-3 text-sm text-rose-100 transition hover:bg-rose-400/12">{common.logout}</button></form>
      </div>
    </section>
  </div>;
}
