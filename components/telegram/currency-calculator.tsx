"use client";

import { useMemo } from "react";

const DEFAULT_RATES = {
  USD: 1.134,
  UAH: 50.8809,
  RUB: 85.1823
} as const;

type SupportedCurrency = keyof typeof DEFAULT_RATES;

const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  USD: "Доллары",
  UAH: "Грн",
  RUB: "Рубли"
};

function formatConvertedAmount(value: number, currency: SupportedCurrency) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: currency === "UAH" || currency === "RUB" ? 0 : 2,
    maximumFractionDigits: currency === "UAH" || currency === "RUB" ? 0 : 2
  }).format(value);
}

export function CurrencyCalculator({
  initialAmount,
  sectionClassName,
  infoCardClassName,
  infoLabelClassName,
  accentTextClassName
}: {
  initialAmount: number;
  sectionClassName: string;
  infoCardClassName: string;
  infoLabelClassName: string;
  accentTextClassName: string;
}) {
  const converted = useMemo(
    () =>
      (Object.keys(DEFAULT_RATES) as SupportedCurrency[]).map((currency) => {
        return {
          currency,
          rate: DEFAULT_RATES[currency],
          total: initialAmount * DEFAULT_RATES[currency]
        };
      }),
    [initialAmount]
  );

  return (
    <section className={`rounded-[24px] px-4 py-4 ${sectionClassName}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={`text-[11px] uppercase tracking-[0.22em] ${infoLabelClassName}`}>Калькулятор валюты</p>
        </div>
        <div className={`rounded-[16px] border px-3 py-2 ${infoCardClassName}`}>
          <p className={`text-[11px] uppercase tracking-[0.18em] ${infoLabelClassName}`}>EUR</p>
          <p className={`mt-2 text-right text-lg font-semibold ${accentTextClassName}`}>{initialAmount}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {converted.map((item) => (
          <div key={item.currency} className={`rounded-[18px] border px-4 py-4 ${infoCardClassName}`}>
            <div className="flex items-center justify-between gap-3">
              <p className={`text-[11px] uppercase tracking-[0.18em] ${infoLabelClassName}`}>
                {item.currency} · {CURRENCY_LABELS[item.currency]}
              </p>
              <p className={`text-lg font-semibold ${accentTextClassName}`}>
                {formatConvertedAmount(item.total, item.currency)}
              </p>
            </div>

            <div className="mt-3">
              <span className={`text-[11px] uppercase tracking-[0.16em] ${infoLabelClassName}`}>Курс за 1 EUR</span>
              <p className={`mt-2 text-sm ${accentTextClassName}`}>{item.rate}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
