"use client";

import { useMemo, useState } from "react";

const DEFAULT_RATES = {
  USD: 1.143,
  UAH: 50.8136,
  RUB: 87.884
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
  const [amountInput, setAmountInput] = useState(() => String(initialAmount || 10));
  const amount = useMemo(() => {
    const parsed = Number(amountInput.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [amountInput]);

  const converted = useMemo(
    () =>
      (Object.keys(DEFAULT_RATES) as SupportedCurrency[]).map((currency) => {
        return {
          currency,
          rate: DEFAULT_RATES[currency],
          total: amount * DEFAULT_RATES[currency]
        };
      }),
    [amount]
  );

  return (
    <section className={`rounded-[24px] px-4 py-4 ${sectionClassName}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={`text-[11px] uppercase tracking-[0.22em] ${infoLabelClassName}`}>Калькулятор валюты</p>
          <p className={`mt-2 text-xs ${infoLabelClassName}`}>Курс обновлён 11.07.2026</p>
        </div>
        <label className={`block rounded-[16px] border px-3 py-2 ${infoCardClassName}`}>
          <p className={`text-[11px] uppercase tracking-[0.18em] ${infoLabelClassName}`}>EUR</p>
          <input
            inputMode="decimal"
            type="text"
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            className={`mt-2 w-20 bg-transparent text-right text-lg font-semibold outline-none ${accentTextClassName}`}
            aria-label="Сумма в евро"
          />
        </label>
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
