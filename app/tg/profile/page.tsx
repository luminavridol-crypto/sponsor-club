export const dynamic = "force-dynamic";

import Image from "next/image";
import { updateProfileAction } from "@/app/actions";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { requireAnyProfile } from "@/lib/auth/guards";
import { getSignedAvatarUrls } from "@/lib/data/profiles";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { DonationEvent, Tier } from "@/lib/types";
import { TIER_LABELS } from "@/lib/utils/tier";

const PROFILE_THEME: Record<
  Tier,
  {
    shell: string;
    header: string;
    eyebrow: string;
    hero: string;
    stat: string;
    section: string;
    item: string;
    button: string;
    accentText: string;
  }
> = {
  tier_1: {
    shell:
      "bg-[radial-gradient(circle_at_top,rgba(146,163,191,0.18),transparent_24%),radial-gradient(circle_at_78%_12%,rgba(90,124,170,0.16),transparent_20%),linear-gradient(180deg,#0b1017_0%,#070a11_48%,#05070c_100%)]",
    header:
      "bg-[linear-gradient(180deg,rgba(46,58,76,0.76),rgba(21,28,40,0.7))] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_48px_rgba(7,18,35,0.35)]",
    eyebrow: "text-slate-200/78",
    hero:
      "border-slate-200/12 bg-[radial-gradient(circle_at_top,rgba(226,232,240,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(125,211,252,0.10),transparent_32%),linear-gradient(180deg,rgba(19,24,34,0.97),rgba(10,13,19,0.99))]",
    stat: "border-slate-200/12 bg-slate-950/45",
    section: "border-slate-200/10 bg-slate-950/35",
    item: "border-slate-200/10 bg-slate-950/45",
    button: "from-slate-300 via-slate-100 to-cyan-200 text-slate-950",
    accentText: "text-slate-100"
  },
  tier_2: {
    shell:
      "bg-[radial-gradient(circle_at_top,rgba(161,55,176,0.22),transparent_24%),radial-gradient(circle_at_82%_10%,rgba(111,64,192,0.18),transparent_18%),linear-gradient(180deg,#130918_0%,#0b0912_50%,#06070c_100%)]",
    header:
      "bg-[linear-gradient(180deg,rgba(71,29,78,0.76),rgba(30,15,42,0.72))] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_48px_rgba(34,11,43,0.36)]",
    eyebrow: "text-fuchsia-100/78",
    hero:
      "border-fuchsia-300/16 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.12),transparent_30%),linear-gradient(180deg,rgba(31,14,38,0.97),rgba(13,10,21,0.99))]",
    stat: "border-fuchsia-300/14 bg-fuchsia-950/22",
    section: "border-fuchsia-300/12 bg-fuchsia-950/16",
    item: "border-fuchsia-300/10 bg-black/18",
    button: "from-fuchsia-500 via-accent to-violet-500 text-white",
    accentText: "text-fuchsia-100"
  },
  tier_3: {
    shell:
      "bg-[radial-gradient(circle_at_top,rgba(196,131,33,0.24),transparent_22%),radial-gradient(circle_at_78%_8%,rgba(184,91,17,0.16),transparent_18%),linear-gradient(180deg,#171008_0%,#0f0a08_48%,#070609_100%)]",
    header:
      "bg-[linear-gradient(180deg,rgba(87,54,21,0.76),rgba(41,22,12,0.72))] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_48px_rgba(42,21,7,0.36)]",
    eyebrow: "text-amber-100/78",
    hero:
      "border-amber-300/18 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.2),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.12),transparent_28%),linear-gradient(180deg,rgba(40,23,11,0.97),rgba(18,11,8,1))]",
    stat: "border-amber-300/16 bg-amber-950/16",
    section: "border-amber-300/12 bg-amber-950/14",
    item: "border-amber-300/10 bg-black/18",
    button: "from-amber-200 via-amber-100 to-orange-200 text-[#281406]",
    accentText: "text-amber-100"
  },
  tier_4: {
    shell:
      "bg-[radial-gradient(circle_at_top,rgba(116,71,184,0.26),transparent_20%),radial-gradient(circle_at_78%_8%,rgba(70,26,132,0.24),transparent_20%),radial-gradient(circle_at_20%_88%,rgba(43,17,87,0.18),transparent_22%),linear-gradient(180deg,#0a0710_0%,#05050a_52%,#020204_100%)]",
    header:
      "bg-[linear-gradient(180deg,rgba(46,28,71,0.8),rgba(18,10,31,0.76))] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_56px_rgba(26,9,49,0.44)]",
    eyebrow: "text-violet-100/82",
    hero:
      "border-violet-300/18 bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.18),transparent_20%),radial-gradient(circle_at_18%_80%,rgba(67,56,202,0.14),transparent_26%),radial-gradient(circle_at_84%_16%,rgba(217,70,239,0.12),transparent_20%),linear-gradient(180deg,rgba(7,7,12,0.98),rgba(2,2,5,1))]",
    stat: "border-violet-300/14 bg-violet-950/18",
    section: "border-violet-300/12 bg-violet-950/14",
    item: "border-violet-300/10 bg-black/20",
    button: "from-violet-300 via-fuchsia-300 to-violet-400 text-white",
    accentText: "text-violet-100"
  }
};

function formatMoney(value: number | null | undefined) {
  const amount = typeof value === "number" ? value : Number(value || 0);
  return `${amount.toFixed(2)} EUR`;
}

function formatAccessDate(value: string | null) {
  if (!value) {
    return "Без ограничения";
  }

  return new Date(value).toLocaleString("ru-RU");
}

function formatBirthDate(value: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function accessLabel(status: "active" | "disabled") {
  return status === "active" ? "Доступ открыт" : "Ожидает доступа";
}

function ProfileStat({
  label,
  value,
  accent = false,
  className = "",
  valueClassName = ""
}: {
  label: string;
  value: string;
  accent?: boolean;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={`rounded-[22px] border px-4 py-3 ${className}`}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/38">{label}</p>
      <p className={`mt-2 text-base font-semibold ${accent ? "text-accentSoft" : "text-white"} ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}

export default async function TelegramProfilePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profileFormId = "telegram-profile-form";
  const params = searchParams ? await searchParams : undefined;
  const isSaved = params?.saved === "1";
  const profile = await requireAnyProfile();
  const theme = PROFILE_THEME[profile.tier];
  const admin = createAdminSupabaseClient();
  const [avatarMap, { data: donations }] = await Promise.all([
    getSignedAvatarUrls(profile.avatar_url ? [profile.avatar_url] : []),
    admin.from("donation_events").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(8)
  ]);
  const avatarUrl = profile.avatar_url ? avatarMap[profile.avatar_url] ?? null : null;
  const recentDonations = (donations ?? []) as DonationEvent[];

  return (
    <MiniAppShell
      profile={profile}
      title="Профиль"
      shellClassName={theme.shell}
      headerClassName={theme.header}
      eyebrowClassName={theme.eyebrow}
    >
      <section className={`relative overflow-hidden rounded-[28px] border p-5 shadow-glow ${theme.hero}`}>
        <div className="absolute -right-10 top-0 h-28 w-28 rounded-full bg-fuchsia-500/12 blur-3xl" />
        <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-cyanGlow/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={profile.display_name || profile.email}
              width={96}
              height={96}
              unoptimized
              className="h-20 w-20 rounded-full border border-white/10 object-cover shadow-[0_10px_30px_rgba(0,0,0,0.28)]"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/10 text-2xl font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
              {(profile.display_name || profile.email).slice(0, 1).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <p className={`text-[11px] uppercase tracking-[0.24em] ${theme.accentText}`}>Личное пространство</p>
            <h2 className="font-display mt-2 text-[1.8rem] font-semibold leading-none text-white">
              {profile.display_name || "Участник клуба"}
            </h2>
            <p className="mt-2 text-sm text-white/60">
              {profile.telegram_username ? `@${profile.telegram_username}` : profile.email}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <ProfileStat
          label="Уровень"
          value={TIER_LABELS[profile.tier]}
          accent
          className={theme.stat}
          valueClassName={theme.accentText}
        />
        <ProfileStat label="Всего донатов" value={formatMoney(profile.total_donations)} className={theme.stat} />
        <ProfileStat label="Статус" value={accessLabel(profile.access_status)} className={theme.stat} />
        <ProfileStat label="Доступ до" value={formatAccessDate(profile.access_expires_at)} className={theme.stat} />
      </section>

      <section className={`rounded-[28px] border p-5 shadow-glow ${theme.section}`}>
        <div className="mb-4">
          <p className={`text-xs uppercase tracking-[0.24em] ${theme.accentText}`}>Анкета участника</p>
          <h3 className="font-display mt-2 text-[1.55rem] font-semibold text-white">Расскажи о себе</h3>
          <p className="mt-2 text-sm leading-6 text-white/62">
            Заполни профиль, чтобы у меня в админке сразу были твои контакты и важная информация.
          </p>
        </div>

        {isSaved ? (
          <div className={`mb-4 rounded-[22px] border px-4 py-3 text-sm text-white ${theme.item}`}>
            Профиль сохранён.
          </div>
        ) : null}

        <form
          id={profileFormId}
          action={updateProfileAction}
          encType="multipart/form-data"
          className="space-y-4"
        >
          <div className="flex justify-end">
            <button
              type="submit"
              form={profileFormId}
              className={`rounded-2xl bg-gradient-to-r px-4 py-3 text-sm font-semibold shadow-[0_14px_36px_rgba(214,74,255,0.28)] ${theme.button}`}
            >
              Сохранить
            </button>
          </div>

          <div className="grid gap-3">
            <label className="block">
              <span className="mb-2 block text-sm text-white/60">Имя</span>
              <input
                name="displayName"
                defaultValue={profile.display_name ?? ""}
                placeholder="Как к тебе обращаться"
                className={`w-full rounded-2xl border px-4 py-3 text-white outline-none ${theme.item}`}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-white/60">О себе</span>
              <textarea
                name="bio"
                defaultValue={profile.bio ?? ""}
                placeholder="Пара слов о тебе, интересах и любимых темах"
                className={`min-h-[120px] w-full rounded-2xl border px-4 py-3 text-white outline-none ${theme.item}`}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm text-white/60">Дата рождения</span>
                <input
                  name="birthDate"
                  type="date"
                  defaultValue={formatBirthDate(profile.birth_date)}
                  className={`w-full rounded-2xl border px-4 py-3 text-white outline-none ${theme.item}`}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-white/60">Telegram</span>
                <input
                  name="telegramContact"
                  defaultValue={profile.telegram_contact ?? profile.telegram_username ?? ""}
                  placeholder="@username или ссылка"
                  className={`w-full rounded-2xl border px-4 py-3 text-white outline-none ${theme.item}`}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm text-white/60">TikTok</span>
                <input
                  name="tiktokContact"
                  defaultValue={profile.tiktok_contact ?? ""}
                  placeholder="@ник или ссылка"
                  className={`w-full rounded-2xl border px-4 py-3 text-white outline-none ${theme.item}`}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-white/60">Любимый косплей Люмины</span>
                <input
                  name="favoriteLuminaCosplay"
                  defaultValue={profile.favorite_lumina_cosplay ?? ""}
                  placeholder="Например: 2B, Yennefer, Makima"
                  className={`w-full rounded-2xl border px-4 py-3 text-white outline-none ${theme.item}`}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm text-white/60">Аватар</span>
              <input name="avatar" type="file" accept="image/*" />
            </label>
          </div>

          <button
            type="submit"
            form={profileFormId}
            className={`w-full rounded-2xl bg-gradient-to-r px-4 py-3 text-sm font-semibold shadow-[0_14px_36px_rgba(214,74,255,0.28)] ${theme.button}`}
          >
            Сохранить профиль
          </button>
        </form>
      </section>

      <section className={`rounded-[28px] border p-5 shadow-glow ${theme.section}`}>
        <p className={`text-xs uppercase tracking-[0.24em] ${theme.accentText}`}>История</p>
        <div className="mt-4 space-y-3">
          {recentDonations.length ? (
            recentDonations.map((event) => (
              <div key={event.id} className={`rounded-2xl border px-4 py-3 ${theme.item}`}>
                <p className="text-sm font-medium text-white">{formatMoney(event.amount)}</p>
                <p className="mt-1 text-xs text-white/45">{new Date(event.created_at).toLocaleString("ru-RU")}</p>
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
