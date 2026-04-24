export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { updateProfileAction } from "@/app/actions";
import { PrivateShell } from "@/components/layout/private-shell";
import { requireProfile } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { DonationEvent } from "@/lib/types";
import { TIER_LABELS } from "@/lib/utils/tier";
import { getVipProgress } from "@/lib/utils/vip";

function formatMoney(value: number | null | undefined) {
  const amount = typeof value === "number" ? value : Number(value || 0);
  return `${amount.toFixed(2)} EUR`;
}

function formatAccessDate(value: string | null) {
  if (!value) {
    return "Без ограничений";
  }

  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getAccessWarning(value: string | null) {
  if (!value) {
    return null;
  }

  const expiresAt = new Date(value);
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return {
      tone: "critical" as const,
      title: "Доступ заканчивается сегодня",
      description: "Нужно срочно продлить подписку, чтобы не потерять доступ."
    };
  }

  if (diffDays === 1) {
    return {
      tone: "critical" as const,
      title: "Остался 1 день",
      description: "Доступ закончится уже завтра."
    };
  }

  if (diffDays <= 3) {
    return {
      tone: "warning" as const,
      title: `Осталось ${diffDays} дня`,
      description: "Срок доступа скоро закончится."
    };
  }

  if (diffDays <= 5) {
    return {
      tone: "notice" as const,
      title: `Осталось ${diffDays} дней`,
      description: "Пора заранее продлить подписку."
    };
  }

  return null;
}

function currentDonationPeriod() {
  const now = new Date();

  return {
    donationYear: now.getUTCFullYear(),
    donationMonth: now.getUTCMonth() + 1
  };
}

function renderProfileStatus(profileTier: string, totalDonations: number | null) {
  if (profileTier === "tier_3") {
    const vip = getVipProgress(totalDonations);

    return {
      currentLabel: `VIP ${vip.current.level} • ${vip.current.name}`,
      nextLabel: vip.next ? `+${formatMoney(vip.remaining)}` : "Максимум"
    };
  }

  return {
    currentLabel: TIER_LABELS[profileTier as keyof typeof TIER_LABELS],
    nextLabel: "VIP открывается по решению автора"
  };
}

export default async function ProfilePage() {
  const profile = await requireProfile();
  const admin = createAdminSupabaseClient();

  if (profile.role === "admin") {
    redirect("/admin/users");
  }

  const { donationYear, donationMonth } = currentDonationPeriod();

  const [{ data: monthDonations }] = await Promise.all([
    admin
      .from("donation_events")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("donation_year", donationYear)
      .eq("donation_month", donationMonth)
  ]);

  const currentMonthDonations = ((monthDonations ?? []) as DonationEvent[]).reduce(
    (sum, event) => sum + Number(event.amount || 0),
    0
  );

  const status = renderProfileStatus(profile.tier, profile.total_donations);
  const accessWarning = getAccessWarning(profile.access_expires_at);

  return (
    <PrivateShell profile={profile}>
      <div className="space-y-4">
        <section className="rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">Member Profile</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Твой профиль</h2>
        </section>

        <section className="grid gap-3 xl:grid-cols-5">
          <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Донаты за месяц</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {formatMoney(currentMonthDonations)}
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Общий донат</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {formatMoney(profile.total_donations)}
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Твой статус</p>
            <p className="mt-2 text-[2rem] font-semibold leading-tight text-accentSoft">
              {status.currentLabel}
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">
              До следующего VIP
            </p>
            <p className="mt-2 text-xl font-semibold text-white">{status.nextLabel}</p>
          </div>

          <div
            className={`rounded-[26px] p-4 ${
              accessWarning?.tone === "critical"
                ? "border border-rose-400/55 bg-rose-500/12 shadow-[0_0_40px_rgba(244,63,94,0.22)]"
                : accessWarning?.tone === "warning"
                  ? "border border-amber-400/40 bg-amber-500/10 shadow-[0_0_40px_rgba(251,191,36,0.14)]"
                  : accessWarning?.tone === "notice"
                    ? "border border-cyanGlow/35 bg-cyanGlow/10 shadow-[0_0_40px_rgba(34,211,238,0.12)]"
                    : "border border-rose-300/35 bg-gradient-to-br from-rose-500/12 to-white/5 shadow-[0_0_30px_rgba(244,63,94,0.12)]"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-rose-300/35 bg-rose-500/15 text-lg font-semibold text-rose-200">
                !
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-rose-100/70">
                  Доступ активен до
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {formatAccessDate(profile.access_expires_at)}
                </p>
              </div>
            </div>

            {accessWarning ? (
              <div
                className={`mt-4 rounded-2xl border px-3 py-3 ${
                  accessWarning.tone === "critical"
                    ? "border-rose-300/35 bg-rose-950/30"
                    : accessWarning.tone === "warning"
                      ? "border-amber-300/30 bg-amber-950/25"
                      : "border-cyanGlow/30 bg-cyanGlow/10"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    accessWarning.tone === "critical"
                      ? "text-rose-200"
                      : accessWarning.tone === "warning"
                        ? "text-amber-200"
                        : "text-cyanGlow"
                  }`}
                >
                  {accessWarning.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-white/70">
                  {accessWarning.description}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.28em] text-cyanGlow">Profile Details</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Информация о тебе</h3>

          <form action={updateProfileAction} className="mt-6 grid gap-4">
            <div>
              <label className="mb-2 block text-sm text-white/60">Email</label>
              <input value={profile.email} disabled />
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/60">Отображаемое имя</label>
              <input name="displayName" defaultValue={profile.display_name ?? ""} />
            </div>
            <button className="w-full rounded-2xl bg-white px-4 py-3 font-medium text-background transition hover:bg-goldSoft sm:w-fit">
              Сохранить профиль
            </button>
          </form>
        </section>
      </div>
    </PrivateShell>
  );
}
