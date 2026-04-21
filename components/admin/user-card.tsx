"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addUserDonationAction,
  addUserDonationForMonthAction,
  deleteUserAction,
  extendUserAccessAction,
  updateUserDetailsAction
} from "@/app/actions";
import { DonationEvent, MemberChatMessage, Profile, Tier } from "@/lib/types";
import { TIER_LABELS } from "@/lib/utils/tier";
import { getVipProgress } from "@/lib/utils/vip";

const QUICK_BADGES = [
  { value: "favorite", label: "любимчик", tone: "violet" },
  { value: "strange", label: "странный", tone: "amber" },
  { value: "promising", label: "перспективный", tone: "rose" },
  { value: "cold", label: "холодный", tone: "cyan" }
] as const;

const MONTH_NAMES = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

function formatMoney(value: number | null | undefined) {
  const amount = typeof value === "number" ? value : Number(value || 0);
  return `${amount.toFixed(2)} EUR`;
}

function formatDateInput(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function formatDateTime(value: string | null) {
  if (!value) return "Не ограничен";

  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getBadgeClass(tone: (typeof QUICK_BADGES)[number]["tone"], active: boolean) {
  const base = "rounded-2xl border px-3 py-2 text-sm transition";

  if (tone === "violet") {
    return active
      ? `${base} border-violet-400/40 bg-violet-400/15 text-violet-200`
      : `${base} border-white/10 bg-white/5 text-white/70 hover:border-violet-400/30`;
  }

  if (tone === "amber") {
    return active
      ? `${base} border-amber-400/40 bg-amber-400/15 text-amber-200`
      : `${base} border-white/10 bg-white/5 text-white/70 hover:border-amber-400/30`;
  }

  if (tone === "rose") {
    return active
      ? `${base} border-rose-400/40 bg-rose-400/15 text-rose-200`
      : `${base} border-white/10 bg-white/5 text-white/70 hover:border-rose-400/30`;
  }

  return active
    ? `${base} border-cyanGlow/40 bg-cyanGlow/15 text-cyanGlow`
    : `${base} border-white/10 bg-white/5 text-white/70 hover:border-cyanGlow/30`;
}

function buildDonationHistory(events: DonationEvent[]) {
  const grouped = new Map<number, number[]>();

  events.forEach((event) => {
    const fallbackDate = new Date(event.created_at);
    const year = event.donation_year ?? fallbackDate.getUTCFullYear();
    const month = (event.donation_month ?? fallbackDate.getUTCMonth() + 1) - 1;
    const current = grouped.get(year) ?? new Array(12).fill(0);
    current[month] += Number(event.amount ?? 0);
    grouped.set(year, current);
  });

  return grouped;
}

function getCurrentMonthDonations(events: DonationEvent[]) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;

  return events.reduce((sum, event) => {
    const fallbackDate = new Date(event.created_at);
    const year = event.donation_year ?? fallbackDate.getUTCFullYear();
    const month = event.donation_month ?? fallbackDate.getUTCMonth() + 1;

    if (year === currentYear && month === currentMonth) {
      return sum + Number(event.amount ?? 0);
    }

    return sum;
  }, 0);
}

function StatCard({
  label,
  value,
  accent = false
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">{label}</p>
      <p className={`mt-3 text-2xl font-semibold ${accent ? "text-accentSoft" : "text-white"}`}>{value}</p>
    </div>
  );
}

function TierQuickButton({
  value,
  currentValue,
  onClick
}: {
  value: Tier;
  currentValue: Tier;
  onClick: (value: Tier) => void;
}) {
  const active = value === currentValue;

  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-2xl border px-4 py-2 text-sm transition ${
        active
          ? "border-accent/40 bg-accent/15 text-accentSoft"
          : "border-white/10 bg-white/5 text-white/80 hover:border-accent/30 hover:bg-white/10"
      }`}
    >
      {TIER_LABELS[value]}
    </button>
  );
}

export function UserCard({
  user,
  isCurrentAdmin,
  donationEvents,
  chatMessages: _chatMessages
}: {
  user: Profile;
  isCurrentAdmin: boolean;
  donationEvents: DonationEvent[];
  chatMessages: MemberChatMessage[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier>(user.tier);
  const [selectedBadges, setSelectedBadges] = useState<string[]>(user.admin_badges ?? []);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [quickAmount, setQuickAmount] = useState("");

  const isVipMember = user.tier === "tier_3";
  const vip = getVipProgress(user.total_donations);

  const donationHistory = useMemo(() => buildDonationHistory(donationEvents), [donationEvents]);
  const currentMonthDonations = useMemo(() => getCurrentMonthDonations(donationEvents), [donationEvents]);
  const availableYears = useMemo(() => {
    const years = Array.from(new Set([new Date().getFullYear(), ...donationHistory.keys()])).sort((a, b) => b - a);
    return years.length ? years : [new Date().getFullYear()];
  }, [donationHistory]);
  const yearMonths = donationHistory.get(selectedYear) ?? new Array(12).fill(0);

  useEffect(() => {
    setSelectedTier(user.tier);
  }, [user.tier]);

  useEffect(() => {
    setSelectedBadges(user.admin_badges ?? []);
  }, [user.admin_badges]);

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  function toggleBadge(value: string) {
    setSelectedBadges((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  return (
    <article className="rounded-[28px] border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-white">
              {user.display_name || "Без имени"}
              {user.role === "admin" ? " • admin" : ""}
            </h3>
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accentSoft">
              {TIER_LABELS[user.tier]}
            </span>
            {isVipMember ? (
              <span className="rounded-full border border-cyanGlow/30 bg-cyanGlow/10 px-3 py-1 text-xs font-medium text-cyanGlow">
                VIP {vip.current.level}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-white/55">{user.email}</p>

          {!isCurrentAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              {[10, 30, 50].map((amount) => (
                <form key={amount} action={addUserDonationAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="donationDelta" value={amount} />
                  <button className="rounded-2xl border border-cyanGlow/30 bg-cyanGlow/10 px-3 py-2 text-sm text-cyanGlow transition hover:bg-cyanGlow/20">
                    +{amount} EUR
                  </button>
                </form>
              ))}

              <form action={addUserDonationAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="userId" value={user.id} />
                <input
                  name="donationDelta"
                  type="number"
                  min="1"
                  step="0.01"
                  value={quickAmount}
                  onChange={(event) => setQuickAmount(event.target.value)}
                  placeholder="Своя сумма"
                  className="h-10 w-32 min-w-0"
                />
                <button className="rounded-2xl border border-cyanGlow/30 bg-cyanGlow/10 px-3 py-2 text-sm text-cyanGlow transition hover:bg-cyanGlow/20">
                  Начислить
                </button>
              </form>

              <form action={extendUserAccessAction}>
                <input type="hidden" name="userId" value={user.id} />
                <button className="rounded-2xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accentSoft transition hover:bg-accent/20">
                  Продлить на 30 дней
                </button>
              </form>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/85 transition hover:border-accent/35 hover:bg-white/5"
          >
            {open ? "Свернуть" : "Открыть подробную информацию"}
          </button>

          {!isCurrentAdmin ? (
            <form action={deleteUserAction}>
              <input type="hidden" name="userId" value={user.id} />
              <button className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-100">
                Удалить
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Донаты за месяц" value={formatMoney(currentMonthDonations)} />
        <StatCard label="Донаты всего" value={formatMoney(user.total_donations)} />

        {isVipMember ? (
          <>
            <StatCard label="VIP уровень" value={`VIP ${vip.current.level} • ${vip.current.name}`} accent />
            <StatCard
              label="До следующего VIP"
              value={vip.next ? `+${formatMoney(vip.remaining)}` : "Максимум"}
            />
          </>
        ) : (
          <>
            <StatCard label="Тариф" value={TIER_LABELS[user.tier]} accent />
            <StatCard label="VIP программа" value="Недоступна" />
          </>
        )}

        <StatCard label="Доступ до" value={formatDateTime(user.access_expires_at)} />
      </div>

      {open ? (
        <div className="mt-5 space-y-5 rounded-3xl border border-white/10 bg-black/10 p-4">
          <form action={updateUserDetailsAction} className="space-y-5">
            <input type="hidden" name="userId" value={user.id} />
            {selectedBadges.map((badge) => (
              <input key={badge} type="hidden" name="adminBadges" value={badge} />
            ))}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-white/60">Имя профиля</label>
                <input name="displayName" defaultValue={user.display_name ?? ""} />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/60">Никнейм</label>
                <input
                  name="nickname"
                  defaultValue={user.nickname ?? ""}
                  placeholder="Ник в игре / на стриме"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/60">Telegram / Контакт</label>
                <input
                  name="telegramContact"
                  defaultValue={user.telegram_contact ?? ""}
                  placeholder="Ссылка или контакт"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/60">TikTok</label>
                <input
                  name="tiktokContact"
                  defaultValue={user.tiktok_contact ?? ""}
                  placeholder="Ссылка или ник"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/60">Дата рождения</label>
                <input name="birthDate" type="date" defaultValue={formatDateInput(user.birth_date)} />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/60">Статус доступа</label>
                <select name="accessStatus" defaultValue={user.access_status}>
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/60">Быстрая метка</label>
              <div className="flex flex-wrap gap-2">
                {QUICK_BADGES.map((badge) => (
                  <button
                    key={badge.value}
                    type="button"
                    onClick={() => toggleBadge(badge.value)}
                    className={getBadgeClass(badge.tone, selectedBadges.includes(badge.value))}
                  >
                    {badge.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedBadges([])}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 transition hover:border-accent/30 hover:bg-white/10"
                >
                  снять
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/60">Личные заметки</label>
              <textarea
                name="adminNote"
                defaultValue={user.admin_note ?? ""}
                placeholder="Любая внутренняя заметка по этому подписчику"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/60">Уровень доступа</label>
              <div className="mb-3 flex flex-wrap gap-2">
                <TierQuickButton value="tier_1" currentValue={selectedTier} onClick={setSelectedTier} />
                <TierQuickButton value="tier_2" currentValue={selectedTier} onClick={setSelectedTier} />
                <TierQuickButton value="tier_3" currentValue={selectedTier} onClick={setSelectedTier} />
              </div>
              <select name="tier" value={selectedTier} onChange={(event) => setSelectedTier(event.target.value as Tier)}>
                <option value="tier_1">{TIER_LABELS.tier_1}</option>
                <option value="tier_2">{TIER_LABELS.tier_2}</option>
                <option value="tier_3">{TIER_LABELS.tier_3}</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="rounded-2xl bg-white px-5 py-3 font-medium text-background transition hover:bg-goldSoft">
                Сохранить изменения
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-white/10 px-5 py-3 text-white/80 transition hover:border-accent/35 hover:bg-white/5"
              >
                Свернуть
              </button>
            </div>
          </form>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-lg font-semibold text-white">История по годам</p>
            <div className="mt-4">
              <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {MONTH_NAMES.map((month, index) => (
                <div key={`${selectedYear}-${index}`} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
                  <p className="text-sm text-white/45">{month}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{Math.round(yearMonths[index] ?? 0)}</p>
                  <p className="mt-1 text-sm text-white/35">EUR</p>

                  <form action={addUserDonationForMonthAction} className="mt-4 flex items-center gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="year" value={selectedYear} />
                    <input type="hidden" name="month" value={index} />
                    <input
                      name="donationDelta"
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="+ сумма"
                      className="min-w-0"
                    />
                    <button className="h-11 w-11 shrink-0 rounded-2xl border border-cyanGlow/30 bg-cyanGlow/10 text-lg font-semibold text-cyanGlow transition hover:bg-cyanGlow/20">
                      +
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
