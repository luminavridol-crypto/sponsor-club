export const dynamic = "force-dynamic";

import Image from "next/image";
import { updateProfileAction } from "@/app/actions";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { requireAnyProfile } from "@/lib/auth/guards";
import { getSignedAvatarUrls } from "@/lib/data/profiles";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { DonationEvent } from "@/lib/types";
import { TIER_LABELS } from "@/lib/utils/tier";

function formatMoney(value: number | null | undefined) {
  const amount = typeof value === "number" ? value : Number(value || 0);
  return `${amount.toFixed(2)} EUR`;
}

export default async function TelegramProfilePage() {
  const profile = await requireAnyProfile();
  const admin = createAdminSupabaseClient();
  const avatarMap = await getSignedAvatarUrls(profile.avatar_url ? [profile.avatar_url] : []);
  const avatarUrl = profile.avatar_url ? avatarMap[profile.avatar_url] ?? null : null;

  const { data: donations } = await admin
    .from("donation_events")
    .select("*")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const recentDonations = (donations ?? []) as DonationEvent[];

  return (
    <MiniAppShell profile={profile} title="Профиль" subtitle="Telegram-профиль без отдельного логина.">
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Уровень</p>
          <p className="mt-2 text-lg font-semibold text-accentSoft">{TIER_LABELS[profile.tier]}</p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Всего донатов</p>
          <p className="mt-2 text-lg font-semibold text-white">{formatMoney(profile.total_donations)}</p>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
        <form action={updateProfileAction} className="space-y-4">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={profile.display_name || profile.email}
                width={88}
                height={88}
                unoptimized
                className="h-20 w-20 rounded-full border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-accent/10 text-2xl font-semibold text-white">
                {(profile.display_name || profile.email).slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">{profile.display_name || "Участник"}</p>
              <p className="mt-1 text-xs text-white/45">{profile.telegram_username ? `@${profile.telegram_username}` : profile.email}</p>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm text-white/60">Имя</span>
            <input
              name="displayName"
              defaultValue={profile.display_name ?? ""}
              className="w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-white outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-white/60">О себе</span>
            <textarea
              name="bio"
              defaultValue={profile.bio ?? ""}
              className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-white outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-white/60">Аватар</span>
            <input name="avatar" type="file" accept="image/*" />
          </label>

          <button className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-background">
            Сохранить
          </button>
        </form>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-accentSoft">История</p>
        <div className="mt-4 space-y-3">
          {recentDonations.length ? (
            recentDonations.map((event) => (
              <div key={event.id} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                <p className="text-sm font-medium text-white">{formatMoney(event.amount)}</p>
                <p className="mt-1 text-xs text-white/45">
                  {new Date(event.created_at).toLocaleString("ru-RU")}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-white/55">Подтверждённых донатов пока нет.</p>
          )}
        </div>
      </section>
    </MiniAppShell>
  );
}
