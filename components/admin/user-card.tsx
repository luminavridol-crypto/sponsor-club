"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  addUserDonationAction,
  addUserDonationForMonthAction,
  deleteUserAction,
  extendUserAccessAction,
  setUserAccessUntilAction,
  stopUserAccessAction,
  updateUserDetailsAction
} from "@/app/actions";
import {
  ADMIN_BADGE_CLASS,
  ADMIN_BUTTON_DANGER_CLASS,
  ADMIN_BUTTON_PRIMARY_CLASS,
  ADMIN_BUTTON_SECONDARY_CLASS,
  ADMIN_INPUT_CLASS,
  ADMIN_SELECT_CLASS,
  ADMIN_SUBPANEL_CLASS,
  ADMIN_TEXTAREA_CLASS,
  getAdminTierTheme
} from "@/components/admin/theme";
import { DonationEvent, Profile, Tier } from "@/lib/types";
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

function formatDateTimeInput(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
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
  const base = "rounded-full border px-3 py-2 text-sm transition";

  if (tone === "violet") {
    return active
      ? `${base} border-violet-300/30 bg-violet-400/12 text-violet-100`
      : `${base} border-white/10 bg-white/[0.04] text-white/70 hover:border-violet-300/24`;
  }

  if (tone === "amber") {
    return active
      ? `${base} border-amber-300/30 bg-amber-400/12 text-amber-100`
      : `${base} border-white/10 bg-white/[0.04] text-white/70 hover:border-amber-300/24`;
  }

  if (tone === "rose") {
    return active
      ? `${base} border-rose-300/30 bg-rose-400/12 text-rose-100`
      : `${base} border-white/10 bg-white/[0.04] text-white/70 hover:border-rose-300/24`;
  }

  return active
    ? `${base} border-cyan-300/28 bg-cyan-400/12 text-cyan-100`
    : `${base} border-white/10 bg-white/[0.04] text-white/70 hover:border-cyan-300/22`;
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
  accent = false,
  className = ""
}: {
  label: string;
  value: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-[20px] border px-3 py-3 ${className}`}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/38">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${accent ? "text-white" : "text-white/92"}`}>{value}</p>
    </div>
  );
}

function ProfileInfoLine({
  label,
  value,
  className = ""
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className={`rounded-[18px] border px-3 py-2 ${className}`}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">{label}</p>
      <p className="mt-1 text-sm text-white/78">{value}</p>
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
      className={`rounded-full border px-4 py-2 text-sm transition ${
        active
          ? "border-fuchsia-300/30 bg-fuchsia-400/12 text-fuchsia-100"
          : "border-white/10 bg-white/[0.03] text-white/78 hover:border-fuchsia-300/24 hover:bg-white/[0.06]"
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
  hideUnlimitedButton = false
}: {
  user: Profile;
  isCurrentAdmin: boolean;
  donationEvents: DonationEvent[];
  hideUnlimitedButton?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier>(user.tier);
  const [selectedBadges, setSelectedBadges] = useState<string[]>(user.admin_badges ?? []);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [quickAmount, setQuickAmount] = useState("");
  const [accessUntil, setAccessUntil] = useState(formatDateTimeInput(user.access_expires_at));

  const isVipMember = user.tier === "tier_3" || user.tier === "tier_4";
  const vip = getVipProgress(user.total_donations);
  const theme = getAdminTierTheme(user.tier);

  const donationHistory = useMemo(() => buildDonationHistory(donationEvents), [donationEvents]);
  const currentMonthDonations = useMemo(() => getCurrentMonthDonations(donationEvents), [donationEvents]);
  const availableYears = useMemo(() => {
    const years = Array.from(new Set([new Date().getFullYear(), ...donationHistory.keys()])).sort((a, b) => b - a);
    return years.length ? years : [new Date().getFullYear()];
  }, [donationHistory]);
  const normalizedSelectedYear = availableYears.includes(selectedYear) ? selectedYear : availableYears[0];
  const yearMonths = donationHistory.get(normalizedSelectedYear) ?? new Array(12).fill(0);

  function toggleBadge(value: string) {
    setSelectedBadges((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  return (
    <article className={`${ADMIN_SUBPANEL_CLASS} ${theme.card}`}>
      <div className={`pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full blur-3xl ${theme.glow}`} />
      <div className="relative">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.display_name || user.email}
                  width={68}
                  height={68}
                  unoptimized
                  className="h-[68px] w-[68px] rounded-full border border-white/10 object-cover shadow-[0_12px_28px_rgba(0,0,0,0.24)]"
                />
              ) : (
                <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-2xl font-semibold text-white shadow-[0_12px_28px_rgba(0,0,0,0.24)]">
                  {(user.display_name || user.email).slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <span className={`${ADMIN_BADGE_CLASS} ${theme.pill}`}>{TIER_LABELS[user.tier]}</span>
                  {isVipMember ? <span className={ADMIN_BADGE_CLASS}>VIP {vip.current.level}</span> : null}
                  {user.role === "admin" ? <span className={ADMIN_BADGE_CLASS}>admin</span> : null}
                </div>
                <h3 className="font-display mt-3 text-[1.4rem] font-semibold text-white">
                  {user.display_name || "Без имени"}
                </h3>
                <p className="mt-1 text-sm text-white/55">{user.email}</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <ProfileInfoLine label="Дата рождения" value={user.birth_date || null} className={theme.subtle} />
              <ProfileInfoLine label="Telegram" value={user.telegram_contact || user.telegram_username || null} className={theme.subtle} />
              <ProfileInfoLine label="TikTok" value={user.tiktok_contact || null} className={theme.subtle} />
              <ProfileInfoLine label="Любимый косплей" value={user.favorite_lumina_cosplay || null} className={theme.subtle} />
            </div>

            {user.admin_note ? (
              <p className={`rounded-[18px] border px-3 py-3 text-sm leading-6 text-white/72 ${theme.subtle}`}>
                {user.admin_note}
              </p>
            ) : null}

            {!isCurrentAdmin ? (
              <div className="flex flex-wrap items-center gap-2">
                {[10, 30, 50].map((amount) => (
                  <form key={amount} action={addUserDonationAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="donationDelta" value={amount} />
                    <button className={ADMIN_BUTTON_SECONDARY_CLASS}>+{amount} EUR</button>
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
                    className="h-11 w-32 min-w-0 rounded-[18px] border border-white/10 bg-black/20 px-3 text-sm text-white outline-none"
                  />
                  <button className={ADMIN_BUTTON_SECONDARY_CLASS}>Начислить</button>
                </form>

                <form action={extendUserAccessAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <button className={ADMIN_BUTTON_PRIMARY_CLASS}>Продлить на 30 дней</button>
                </form>

                <form action={setUserAccessUntilAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="userId" value={user.id} />
                  <input
                    name="accessUntil"
                    type="datetime-local"
                    value={accessUntil}
                    onChange={(event) => setAccessUntil(event.target.value)}
                    className="h-11 w-[220px] min-w-0 rounded-[18px] border border-white/10 bg-black/20 px-3 text-sm text-white outline-none"
                  />
                  <button className={ADMIN_BUTTON_SECONDARY_CLASS}>Установить срок</button>
                </form>

                {!hideUnlimitedButton ? (
                  <form action={setUserAccessUntilAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <button type="submit" onClick={() => setAccessUntil("")} className={ADMIN_BUTTON_SECONDARY_CLASS}>
                      Без ограничения
                    </button>
                  </form>
                ) : null}

                <form action={stopUserAccessAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <button className={ADMIN_BUTTON_DANGER_CLASS}>Остановить</button>
                </form>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setOpen((prev) => !prev)} className={ADMIN_BUTTON_SECONDARY_CLASS}>
              {open ? "Свернуть" : "Открыть подробности"}
            </button>

            {!isCurrentAdmin ? (
              <form action={deleteUserAction}>
                <input type="hidden" name="userId" value={user.id} />
                <button className={ADMIN_BUTTON_DANGER_CLASS}>Удалить</button>
              </form>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="За месяц" value={formatMoney(currentMonthDonations)} className={theme.subtle} />
          <StatCard label="Всего" value={formatMoney(user.total_donations)} className={theme.subtle} />

          {isVipMember ? (
            <>
              <StatCard label="VIP уровень" value={`VIP ${vip.current.level} • ${vip.current.name}`} accent className={theme.subtle} />
              <StatCard
                label="До следующего VIP"
                value={vip.next ? `+${formatMoney(vip.remaining)}` : "Максимум"}
                className={theme.subtle}
              />
            </>
          ) : (
            <>
              <StatCard label="Тариф" value={TIER_LABELS[user.tier]} accent className={theme.subtle} />
              <StatCard label="VIP программа" value="Недоступна" className={theme.subtle} />
            </>
          )}

          <StatCard label="Доступ до" value={formatDateTime(user.access_expires_at)} className={theme.subtle} />
        </div>

        {open ? (
          <div className={`mt-4 space-y-4 rounded-[26px] border p-4 ${theme.subtle}`}>
            <form action={updateUserDetailsAction} className="space-y-4">
              <input type="hidden" name="userId" value={user.id} />
              {selectedBadges.map((badge) => (
                <input key={badge} type="hidden" name="adminBadges" value={badge} />
              ))}

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-white/60">Имя профиля</label>
                  <input name="displayName" defaultValue={user.display_name ?? ""} className={ADMIN_INPUT_CLASS} />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/60">Никнейм</label>
                  <input
                    name="nickname"
                    defaultValue={user.nickname ?? ""}
                    placeholder="Ник в игре или на стриме"
                    className={ADMIN_INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/60">Telegram</label>
                  <input
                    name="telegramContact"
                    defaultValue={user.telegram_contact ?? ""}
                    placeholder="Ссылка или контакт"
                    className={ADMIN_INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/60">TikTok</label>
                  <input
                    name="tiktokContact"
                    defaultValue={user.tiktok_contact ?? ""}
                    placeholder="Ссылка или ник"
                    className={ADMIN_INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/60">Любимый косплей Люмины</label>
                  <input
                    name="favoriteLuminaCosplay"
                    defaultValue={user.favorite_lumina_cosplay ?? ""}
                    placeholder="Например: 2B, Makima, Yennefer"
                    className={ADMIN_INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/60">Аватар</label>
                  <input name="avatar" type="file" accept="image/*" className="block w-full text-sm text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white" />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/60">Дата рождения</label>
                  <input name="birthDate" type="date" defaultValue={formatDateInput(user.birth_date)} className={ADMIN_INPUT_CLASS} />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/60">Статус доступа</label>
                  <select name="accessStatus" defaultValue={user.access_status} className={ADMIN_SELECT_CLASS}>
                    <option value="active">active</option>
                    <option value="disabled">disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/60">Быстрые метки</label>
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
                    className={ADMIN_BUTTON_SECONDARY_CLASS}
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
                  placeholder="Внутренняя заметка по подписчику"
                  className={ADMIN_TEXTAREA_CLASS}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/60">Уровень доступа</label>
                <div className="mb-3 flex flex-wrap gap-2">
                  <TierQuickButton value="tier_1" currentValue={selectedTier} onClick={setSelectedTier} />
                  <TierQuickButton value="tier_2" currentValue={selectedTier} onClick={setSelectedTier} />
                  <TierQuickButton value="tier_3" currentValue={selectedTier} onClick={setSelectedTier} />
                  <TierQuickButton value="tier_4" currentValue={selectedTier} onClick={setSelectedTier} />
                </div>
                <select name="tier" value={selectedTier} onChange={(event) => setSelectedTier(event.target.value as Tier)} className={ADMIN_SELECT_CLASS}>
                  <option value="tier_1">{TIER_LABELS.tier_1}</option>
                  <option value="tier_2">{TIER_LABELS.tier_2}</option>
                  <option value="tier_3">{TIER_LABELS.tier_3}</option>
                  <option value="tier_4">{TIER_LABELS.tier_4}</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <button className={ADMIN_BUTTON_PRIMARY_CLASS}>Сохранить изменения</button>
                <button type="button" onClick={() => setOpen(false)} className={ADMIN_BUTTON_SECONDARY_CLASS}>
                  Свернуть
                </button>
              </div>
            </form>

            <div className={`rounded-[24px] border p-4 ${theme.subtle}`}>
              <p className="font-display text-[1.2rem] font-semibold text-white">История по годам</p>
              <div className="mt-4">
                <select value={normalizedSelectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} className={ADMIN_SELECT_CLASS}>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {MONTH_NAMES.map((month, index) => (
                  <div key={`${normalizedSelectedYear}-${index}`} className="rounded-[20px] border border-white/10 bg-black/18 px-3 py-3">
                    <p className="text-sm text-white/45">{month}</p>
                    <p className="mt-2 text-xl font-semibold text-white">{Math.round(yearMonths[index] ?? 0)}</p>
                    <p className="mt-1 text-sm text-white/35">EUR</p>

                    <form action={addUserDonationForMonthAction} className="mt-3 flex items-center gap-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="year" value={normalizedSelectedYear} />
                      <input type="hidden" name="month" value={index} />
                      <input
                        name="donationDelta"
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="+ сумма"
                        className="min-w-0 rounded-[16px] border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
                      />
                      <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.05] text-lg font-semibold text-white transition hover:bg-white/[0.08]">
                        +
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
