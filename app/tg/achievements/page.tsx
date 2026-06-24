export const dynamic = "force-dynamic";

import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { hasClubAccess } from "@/lib/auth/access";
import { requireContentProfile } from "@/lib/auth/guards";
import { hasApprovedPurchasedPosts } from "@/lib/data/post-purchases";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { DonationEvent } from "@/lib/types";

const MIN_MONTHLY_DONATION = 10;
const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTH_LABELS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь"
];

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function diffDays(from: Date, to: Date) {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.max(Math.floor(ms / 86_400_000) + 1, 0);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function getCurrentDonationStreakStart(
  donations: DonationEvent[],
  joinedAt: Date,
  today: Date,
  accessStatus: "active" | "disabled"
) {
  if (accessStatus !== "active") {
    return null;
  }

  const monthlyTotals = new Map<string, number>();

  for (const donation of donations) {
    const amount = Number(donation.amount ?? 0);

    if (amount < MIN_MONTHLY_DONATION) {
      continue;
    }

    const donationDate = new Date(donation.created_at);
    const key = monthKey(donationDate);
    monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + amount);
  }

  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  if ((monthlyTotals.get(monthKey(currentMonth)) ?? 0) < MIN_MONTHLY_DONATION) {
    return null;
  }

  let streakMonth = currentMonth;

  while (true) {
    const previousMonth = addMonths(streakMonth, -1);
    const previousTotal = monthlyTotals.get(monthKey(previousMonth)) ?? 0;

    if (previousTotal < MIN_MONTHLY_DONATION) {
      break;
    }

    streakMonth = previousMonth;
  }

  const joinedDay = startOfDay(joinedAt);
  const streakStart = new Date(streakMonth.getFullYear(), streakMonth.getMonth(), 1);

  return joinedDay > streakStart ? joinedDay : streakStart;
}

function monthMatrix(currentDate: Date, streakStart: Date | null) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  const cells: Array<
    | { kind: "empty"; key: string }
    | { kind: "day"; key: string; day: number; active: boolean; today: boolean }
  > = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ kind: "empty", key: `empty-${i}` });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    const active = streakStart
      ? startOfDay(date) >= startOfDay(streakStart) && startOfDay(date) <= startOfDay(currentDate)
      : false;
    const today = date.toDateString() === currentDate.toDateString();

    cells.push({ kind: "day", key: `day-${day}`, day, active, today });
  }

  return cells;
}

export default async function TelegramAchievementsPage() {
  const profile = await requireContentProfile();
  const admin = createAdminSupabaseClient();
  const hasContentAccess = hasClubAccess(profile) || (await hasApprovedPurchasedPosts(profile));

  const { data: donationsData } = await admin
    .from("donation_events")
    .select("*")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: true });

  const joinedAt = new Date(profile.created_at);
  const today = new Date();
  const donations = (donationsData ?? []) as DonationEvent[];
  const streakStart = getCurrentDonationStreakStart(donations, joinedAt, today, profile.access_status);
  const streakDays = streakStart ? diffDays(streakStart, today) : 0;
  const currentMonthCells = monthMatrix(today, streakStart);
  const currentMonthName = MONTH_LABELS[today.getMonth()];

  return (
    <MiniAppShell profile={profile} title="Достижения" hasAccess={hasContentAccess}>
      <section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-5 py-5 text-white shadow-[0_18px_46px_rgba(0,0,0,0.22)]">
        <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">Daily marks</p>
        <h2 className="mt-2 font-display text-[1.7rem] leading-none text-white">Ежедневные отметки</h2>
        <p className="mt-3 max-w-[38rem] text-sm leading-6 text-white/68">
          Отметки считаются с первого дня активной серии в клубе и продолжаются, пока каждый месяц есть донат минимум на 10 EUR.
          Если один месяц пропущен и доступ уходит в заморозку, серия обнуляется.
        </p>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-5 text-white shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Серия</p>
            <h3 className="mt-2 font-display text-[1.6rem] leading-none text-white">
              {streakDays > 0 ? `${streakDays} ${streakDays === 1 ? "день" : streakDays < 5 ? "дня" : "дней"}` : "0 дней"}
            </h3>
            <p className="mt-3 max-w-[34rem] text-sm leading-6 text-white/62">
              {streakStart
                ? `Текущая серия идёт с ${streakStart.toLocaleDateString("ru-RU")}.`
                : `Серия пока не активна. Для старта нужен донат минимум ${MIN_MONTHLY_DONATION} EUR в текущем месяце.`}
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/62">
            {profile.access_status === "active" ? "Доступ активен" : "Заморозка"}
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/10 bg-black/14 px-4 py-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Календарь</p>
              <h3 className="mt-2 font-display text-[1.5rem] leading-none text-white">{currentMonthName}</h3>
            </div>
            <p className="text-sm text-white/58">Ежедневные отметки серии</p>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-2">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="pb-1 text-center text-[11px] uppercase tracking-[0.16em] text-white/35">
                {label}
              </div>
            ))}

            {currentMonthCells.map((cell) =>
              cell.kind === "empty" ? (
                <div key={cell.key} className="h-10 rounded-[14px] border border-transparent" />
              ) : (
                <div
                  key={cell.key}
                  className={`flex h-10 items-center justify-center rounded-[14px] border text-sm ${
                    cell.today
                      ? "border-fuchsia-300/34 bg-fuchsia-400/14 text-white"
                      : cell.active
                        ? "border-emerald-300/18 bg-emerald-400/12 text-emerald-50"
                        : "border-white/8 bg-black/12 text-white/32"
                  }`}
                >
                  {cell.day}
                </div>
              )
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/55">
            <span className="rounded-full border border-emerald-300/18 bg-emerald-400/12 px-3 py-1">День засчитан</span>
            <span className="rounded-full border border-fuchsia-300/24 bg-fuchsia-400/14 px-3 py-1">Сегодня</span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">Минимум {MIN_MONTHLY_DONATION} EUR в месяц</span>
          </div>
        </div>
      </section>
    </MiniAppShell>
  );
}
