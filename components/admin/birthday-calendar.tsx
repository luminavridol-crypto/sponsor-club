"use client";

import { useMemo, useState } from "react";

type BirthdayPerson = {
  id: string;
  displayName: string;
  birthDate: string;
  tierLabel: string;
  tierKey: "tier_1" | "tier_2" | "tier_3";
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
  return new Intl.DateTimeFormat("ru-RU", { month: "long" }).format(
    new Date(2026, monthIndex, 1)
  );
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
  if (tierKey === "tier_3") {
    return "border-yellow-400/30 bg-yellow-400/10";
  }

  if (tierKey === "tier_2") {
    return "border-cyanGlow/25 bg-cyanGlow/10";
  }

  return "border-emerald-400/20 bg-emerald-400/10";
}

function getBirthdayTierTextClass(tierKey: BirthdayPerson["tierKey"]) {
  if (tierKey === "tier_3") {
    return "text-yellow-300";
  }

  if (tierKey === "tier_2") {
    return "text-cyanGlow";
  }

  return "text-emerald-300";
}

export function BirthdayCalendar({ birthdays }: { birthdays: BirthdayPerson[] }) {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const todayDay = today.getDate();
  const isCurrentMonthView =
    selectedYear === today.getFullYear() && selectedMonth === today.getMonth();

  const years = useMemo(() => {
    const currentYear = today.getFullYear();
    return Array.from({ length: 9 }, (_, index) => currentYear - 2 + index);
  }, [today]);

  const monthBirthdays = useMemo(() => {
    return birthdays
      .filter((person) => parseMonthDay(person.birthDate).month - 1 === selectedMonth)
      .sort((left, right) => parseMonthDay(left.birthDate).day - parseMonthDay(right.birthDate).day);
  }, [birthdays, selectedMonth]);

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
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-glow sm:rounded-[32px] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-cyanGlow">Календарь</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Дни рождения подписчиков</h3>
        </div>
        <div className="flex gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:border-accent/35 hover:bg-white/5"
          >
            ←
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:border-accent/35 hover:bg-white/5"
          >
            →
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_120px]">
        <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white capitalize sm:text-base">
          {getMonthName(selectedMonth)} {selectedYear}
        </div>
        <select
          value={selectedYear}
          onChange={(event) => setSelectedYear(Number(event.target.value))}
          className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none transition focus:border-accent/40 sm:text-base"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1.5 text-center sm:gap-2">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="text-[10px] uppercase tracking-[0.12em] text-white/40 sm:text-xs sm:tracking-[0.16em]">
            {day}
          </div>
        ))}

        {calendarDays.map((day, index) => (
          <div
            key={`${day.day}-${day.inCurrentMonth}-${index}`}
            className={`rounded-xl border px-1.5 py-2 text-xs transition sm:rounded-2xl sm:px-2 sm:py-3 sm:text-sm ${
              day.inCurrentMonth
                ? isCurrentMonthView && day.day === todayDay
                  ? day.birthdayCount > 0
                    ? "border-cyanGlow bg-cyanGlow/20 text-white shadow-[0_0_0_1px_rgba(103,232,249,0.22),0_0_28px_rgba(34,211,238,0.16)]"
                    : "border-cyanGlow/70 bg-cyanGlow/12 text-white shadow-[0_0_0_1px_rgba(103,232,249,0.18),0_0_24px_rgba(34,211,238,0.12)]"
                  : day.birthdayCount > 0
                    ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                    : "border-white/10 bg-black/10 text-white"
                : "border-white/5 bg-transparent text-white/25"
            }`}
          >
            <div className="font-medium">{day.day}</div>
            {day.birthdayCount > 0 ? (
              <div className="mt-1 text-[11px] text-emerald-300">{day.birthdayCount} д.р.</div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-3xl border border-white/10 bg-black/10 p-4">
        <p className="text-sm text-white/60">Именинники выбранного месяца</p>
        <div className="mt-3 space-y-2">
          {monthBirthdays.length ? (
            monthBirthdays.map((person) => {
              const parsed = parseMonthDay(person.birthDate);

              return (
                <div
                  key={person.id}
                  className={`flex flex-col gap-2 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${getBirthdayRowClass(person.tierKey)}`}
                >
                  <div>
                    <p className="font-medium text-white">{person.displayName}</p>
                    <p className={`text-sm ${getBirthdayTierTextClass(person.tierKey)}`}>{person.tierLabel}</p>
                  </div>
                  <div className={`text-sm font-medium ${getBirthdayTierTextClass(person.tierKey)}`}>
                    {String(parsed.day).padStart(2, "0")}.{String(parsed.month).padStart(2, "0")}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/55">
              В этом месяце дней рождения не добавлено.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
