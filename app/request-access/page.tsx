export const dynamic = "force-dynamic";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { createTelegramAccessRequestAction, createWebsiteAccessRequestAction } from "@/app/actions";
import { BrandShell } from "@/components/layout/brand-shell";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { hasClubAccess } from "@/lib/auth/access";
import { getCurrentProfile, getCurrentWebsiteProfile } from "@/lib/auth/current-profile";
import { getI18n } from "@/lib/i18n/server";
import { getTelegramProfileFromSession } from "@/lib/telegram/auth";
import type { Tier } from "@/lib/types";
import { TIER_LABELS } from "@/lib/utils/tier";

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseTier(value: string | string[] | undefined): Tier {
  const tier = readParam(value);
  return tier === "tier_2" || tier === "tier_3" || tier === "tier_4" ? tier : "tier_1";
}

export default async function RequestAccessPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const telegramProfile = await getTelegramProfileFromSession();
  const profile = telegramProfile ?? (await getCurrentWebsiteProfile()) ?? (await getCurrentProfile());
  const tier = parseTier(params.tier);
  if (!profile) redirect(`/login?next=${encodeURIComponent(`/request-access?tier=${tier}`)}` as Route);

  const { messages } = await getI18n();
  const copy = messages.request;
  const status = readParam(params.status);
  const form = (
    <section className="mx-auto w-full max-w-2xl rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,79,216,0.12),transparent_38%),rgba(12,9,22,0.9)] p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.4)] sm:p-8">
      <p className="text-xs uppercase tracking-[0.28em] text-accentSoft">Lumina Club</p>
      <h1 className="mt-3 font-display text-3xl">{copy.title}</h1>
      <p className="mt-3 text-sm leading-6 text-white/60">{copy.description}</p>
      {status === "created" ? <p className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{copy.success}</p> : null}
      {status === "already_pending" ? <p className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">{copy.alreadyPending}</p> : null}
      {status === "error" ? <p className="mt-5 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{copy.error}</p> : null}
      <form action={telegramProfile ? createTelegramAccessRequestAction : createWebsiteAccessRequestAction} className="mt-6 grid gap-4">
        <label className="text-sm text-white/65">{copy.tier}
          <select name="tier" defaultValue={tier} className="mt-1.5 w-full rounded-2xl border border-white/10 bg-[#100b19] px-4 py-3 text-white outline-none focus:border-accent/50">
            {(["tier_1", "tier_2", "tier_3", "tier_4"] as Tier[]).map((value) => <option key={value} value={value}>{TIER_LABELS[value]}</option>)}
          </select>
        </label>
        <label className="text-sm text-white/65">{copy.comment}
          <textarea name="comment" maxLength={1000} rows={4} placeholder={copy.commentPlaceholder} className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-accent/50" />
        </label>
        <button type="submit" className="rounded-2xl border border-accent/40 bg-gradient-to-r from-accent/75 to-[#7040f4] px-4 py-3 font-semibold text-white shadow-[0_16px_38px_rgba(255,79,216,0.22)] transition hover:brightness-110">{copy.submit}</button>
      </form>
      <p className="mt-4 text-xs leading-5 text-white/40">{copy.pending}</p>
    </section>
  );

  if (telegramProfile) {
    return <MiniAppShell profile={profile} title={copy.title} hasAccess={hasClubAccess(profile)}>{form}</MiniAppShell>;
  }
  return <BrandShell><main className="min-h-[calc(100vh-84px)] px-4 py-10 sm:py-14">{form}</main></BrandShell>;
}
