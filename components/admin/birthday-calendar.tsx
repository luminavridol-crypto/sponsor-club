"use client";

import { useMemo, useState } from "react";
import { ADMIN_BUTTON_SECONDARY_CLASS, ADMIN_PANEL_CLASS, ADMIN_PANEL_GLOW_CLASS } from "@/components/admin/theme";

type BirthdayPerson = {
  id: string;
  displayName: string;
  birthDate: string;
  tierLabel: string;
  tierKey: "tier_1" | "tier_2" | "tier_3" | "tier_4";
};

type CalendarDay = {
  day: number;
  inCurrentMonth: boolean;
  birthdayCount: number;
};

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function parseMonthDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function getMonthName(monthIndex: number) {
  return new Intl.DateTimeFormat("ru-RU", { month: "long" }).format(new Date(2026, monthIndex, 1));
}

function buildCalendarDays(year: number, month: number, birthdays: BirthdayPerson[]): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();

  const birthdayMap = new Map<number, number>();
  birthdays.forEach((person) => {
    const parsed = parseMonthDay(person.birthDate);
    if (parsed.month - 1 === month) {
      birthdayMap.set(parsed.day, (birthdayMap.get(parsed.day) ?? 0) + 1);
    }
  });

  const days: CalendarDay[] = [];

  for (let index = firstWeekday - 1; index >= 0; index -= 1) {
    days.push({
      day: previousMonthDays - index,
      inCurrentMonth: false,
      birthdayCount: 0
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({
      day,
      inCurrentMonth: true,
      birthdayCount: birthdayMap.get(day) ?? 0
    });
  }

  while (days.length % 7 !== 0) {
    days.push({
      day: days.length - (firstWeekday + daysInMonth) + 1,
      inCurrentMonth: false,
      birthdayCount: 0
    });
  }

  return days;
}

function getBirthdayRowClass(tierKey: BirthdayPerson["tierKey"]) {
  if (tierKey === "tier_4") return "border-violet-300/22 bg-violet-400/12";
  if (tierKey === "tier_3") return "border-amber-300/22 bg-amber-400/12";
  if (tierKey === "tier_2") return "border-fuchsia-300/22 bg-fuchsia-400/12";
  return "border-slate-200/18 bg-slate-300/10";
}

function getBirthdayTierTextClass(tierKey: BirthdayPerson["tierKey"]) {
  if (tierKey === "tier_4") return "text-violet-100";
  if (tierKey === "tier_3") return "text-amber-100";
  if (tierKey === "tier_2") return "text-fuchsia-100";
  return "text-slate-100";
}

export function BirthdayCalendar({ birthdays }: { birthdays: BirthdayPerson[] }) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthIndex = today.getMonth();
  const currentDay = today.getDate();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const isCurrentMonthView = selectedYear === currentYear && selectedMonth === currentMonthIndex;

  const years = useMemo(() => Array.from({ length: 9 }, (_, index) => currentYear - 2 + index), [currentYear]);

  const monthBirthdays = useMemo(() => {
    return birthdays
      .filter((person) => parseMonthDay(person.birthDate).month - 1 === selectedMonth)
      .sort((left, right) => parseMonthDay(left.birthDate).day - parseMonthDay(right.birthDate).day);
  }, [birthdays, selectedMonth]);

  const upcomingBirthdays = useMemo(() => {
    const currentMonth = currentMonthIndex + 1;

    return birthdays
      .map((person) => {
        const parsed = parseMonthDay(person.birthDate);
        const candidate = new Date(currentYear, parsed.month - 1, parsed.day);
        const nextDate =
          parsed.month < currentMonth || (parsed.month === currentMonth && parsed.day < currentDay)
            ? new Date(currentYear + 1, parsed.month - 1, parsed.day)
            : candidate;

        return { ...person, parsed, nextDate };
      })
      .sort((left, right) => left.nextDate.getTime() - right.nextDate.getTime())
      .slice(0, 3);
  }, [birthdays, currentDay, currentMonthIndex, currentYear]);

  const calendarDays = useMemo(
    () => buildCalendarDays(selectedYear, selectedMonth, birthdays),
    [birthdays, selectedMonth, selectedYear]
  );

  function goToPreviousMonth() {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((value) => value - 1);
      return;
    }

    setSelectedMonth((value) => value - 1);
  }

  function goToNextMonth() {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((value) => value + 1);
      return;
    }

    setSelectedMonth((value) => value + 1);
  }

  return (
    <section className={ADMIN_PANEL_CLASS}>
      <div className={ADMIN_PANEL_GLOW_CLASS} />
      <div className="relative">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-display text-[1.3rem] font-semibold text-white sm:text-[1.4rem]">Дни рождения</h3>
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className={`${ADMIN_BUTTON_SECONDARY_CLASS} h-12 min-h-0 px-4 py-0 text-base`}
            >
              ←
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              className={`${ADMIN_BUTTON_SECONDARY_CLASS} h-12 min-h-0 px-4 py-0 text-base`}
            >
              →
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <div className="grid gap-2 sm:grid-cols-[1fr_104px]">
              <div className="rounded-[18px] border border-white/10 bg-black/18 px-3 py-2.5 text-sm capitalize text-white sm:text-[0.95rem]">
                {getMonthName(selectedMonth)} {selectedYear}
              </div>
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
                className="rounded-[18px] border border-white/10 bg-black/18 px-3 py-2.5 text-sm text-white outline-none sm:text-[0.95rem]"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="text-[10px] uppercase tracking-[0.12em] text-white/40 sm:text-[11px] sm:tracking-[0.16em]">
                  {day}
                </div>
              ))}

              {calendarDays.map((day, index) => (
                <div
                  key={`${day.day}-${day.inCurrentMonth}-${index}`}
                  className={`rounded-xl border px-1 py-1.5 text-[11px] transition sm:rounded-[18px] sm:px-1.5 sm:py-2 sm:text-xs ${
                    day.inCurrentMonth
                      ? isCurrentMonthView && day.day === currentDay
                        ? day.birthdayCount > 0
                          ? "border-fuchsia-300/40 bg-fuchsia-400/18 text-white shadow-[0_0_0_1px_rgba(217,70,239,0.22),0_0_28px_rgba(217,70,239,0.12)]"
                          : "border-fuchsia-300/24 bg-fuchsia-400/12 text-white"
                        : day.birthdayCount > 0
                          ? "border-amber-300/24 bg-amber-400/12 text-amber-100"
                          : "border-white/10 bg-black/18 text-white"
                      : "border-white/5 bg-transparent text-white/25"
                  }`}
                >
                  <div className="font-medium">{day.day}</div>
                  {day.birthdayCount > 0 ? <div className="mt-0.5 text-[10px] text-fuchsia-100">{day.birthdayCount} д.р.</div> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[22px] border border-white/10 bg-black/18 p-3.5">
              <p className="text-sm text-white/60">Ближайшие напоминания</p>
              <div className="mt-2.5 space-y-2">
                {upcomingBirthdays.length ? (
                  upcomingBirthdays.map((person) => (
                    <div
                      key={`upcoming-${person.id}`}
                      className={`flex items-center justify-between gap-3 rounded-[16px] border px-3 py-2.5 ${getBirthdayRowClass(person.tierKey)}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{person.displayName}</p>
                        <p className={`text-sm ${getBirthdayTierTextClass(person.tierKey)}`}>{person.tierLabel}</p>
                      </div>
                      <div className={`shrink-0 text-sm font-medium ${getBirthdayTierTextClass(person.tierKey)}`}>
                        {String(person.parsed.day).padStart(2, "0")}.{String(person.parsed.month).padStart(2, "0")}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[16px] border border-white/10 px-3 py-2.5 text-sm text-white/55">
                    Нет ближайших напоминаний.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/18 p-3.5">
              <p className="text-sm text-white/60">Именинники выбранного месяца</p>
              <div className="mt-2.5 space-y-2">
                {monthBirthdays.length ? (
                  monthBirthdays.map((person) => {
                    const parsed = parseMonthDay(person.birthDate);

                    return (
                      <div
                        key={person.id}
                        className={`flex items-center justify-between gap-3 rounded-[16px] border px-3 py-2.5 ${getBirthdayRowClass(person.tierKey)}`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{person.displayName}</p>
                          <p className={`text-sm ${getBirthdayTierTextClass(person.tierKey)}`}>{person.tierLabel}</p>
                        </div>
                        <div className={`shrink-0 text-sm font-medium ${getBirthdayTierTextClass(person.tierKey)}`}>
                          {String(parsed.day).padStart(2, "0")}.{String(parsed.month).padStart(2, "0")}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[16px] border border-white/10 px-3 py-2.5 text-sm text-white/55">
                    В этом месяце дней рождения не добавлено.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
