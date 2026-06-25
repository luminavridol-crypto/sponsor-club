export const dynamic = "force-dynamic";

import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { CurrencyCalculator } from "@/components/telegram/currency-calculator";
import { SupportRequestForm } from "@/components/telegram/support-request-form";
import { hasClubAccess } from "@/lib/auth/access";
import { requireAnyProfile } from "@/lib/auth/guards";
import { hasApprovedPurchasedPosts } from "@/lib/data/post-purchases";
import { getTelegramSupportSettings } from "@/lib/data/telegram-support";
import { getTierLandingCards } from "@/lib/data/tier-landing";
import { Tier } from "@/lib/types";
import { formatEuroAmount } from "@/lib/utils/money";

const SUPPORT_THEME: Record<
  Tier,
  {
    shell: string;
    panel: string;
    statusBadge: string;
    tierCardIdle: string;
    tierCardActive: string;
    tierPriceActive: string;
    section: string;
    infoCard: string;
    infoLabel: string;
    accentText: string;
    submitButton: string;
  }
> = {
  tier_1: {
    shell:
      "bg-[radial-gradient(circle_at_top,rgba(146,163,191,0.14),transparent_22%),radial-gradient(circle_at_82%_12%,rgba(90,124,170,0.12),transparent_18%),linear-gradient(180deg,#12151d_0%,#0d1118_52%,#090c12_100%)]",
    panel:
      "border-slate-200/10 bg-[radial-gradient(circle_at_top,rgba(203,213,225,0.06),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))]",
    statusBadge: "bg-slate-200/10 text-slate-100",
    tierCardIdle: "bg-slate-400/[0.08] text-white/78 hover:bg-slate-300/[0.14] hover:text-white",
    tierCardActive: "bg-[linear-gradient(180deg,#f8fafc,#dbe7f5)] text-slate-950 shadow-[0_12px_32px_rgba(163,191,223,0.18)]",
    tierPriceActive: "text-slate-700",
    section: "bg-slate-950/28 border border-slate-200/10",
    infoCard: "border-slate-200/10 bg-slate-950/34",
    infoLabel: "text-slate-200/52",
    accentText: "text-slate-100",
    submitButton: "bg-[linear-gradient(135deg,#f8fafc,#dbeafe)] text-slate-950 hover:opacity-95"
  },
  tier_2: {
    shell:
      "bg-[radial-gradient(circle_at_top,rgba(161,55,176,0.2),transparent_24%),radial-gradient(circle_at_82%_10%,rgba(111,64,192,0.16),transparent_18%),linear-gradient(180deg,#160d1d_0%,#100b18_52%,#0b0a12_100%)]",
    panel:
      "border-fuchsia-300/12 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))]",
    statusBadge: "bg-fuchsia-400/14 text-fuchsia-100",
    tierCardIdle: "bg-fuchsia-400/[0.08] text-white/78 hover:bg-fuchsia-300/[0.14] hover:text-white",
    tierCardActive: "bg-[linear-gradient(135deg,#f5d0fe,#e879f9)] text-[#2d1236] shadow-[0_12px_32px_rgba(217,70,239,0.2)]",
    tierPriceActive: "text-[#5b1d63]",
    section: "bg-fuchsia-950/18 border border-fuchsia-300/12",
    infoCard: "border-fuchsia-300/12 bg-black/22",
    infoLabel: "text-fuchsia-100/58",
    accentText: "text-fuchsia-100",
    submitButton: "bg-[linear-gradient(135deg,#f0abfc,#d946ef)] text-white hover:opacity-95"
  },
  tier_3: {
    shell:
      "bg-[radial-gradient(circle_at_top,rgba(196,131,33,0.22),transparent_22%),radial-gradient(circle_at_78%_8%,rgba(184,91,17,0.14),transparent_18%),linear-gradient(180deg,#1a130d_0%,#130e0a_52%,#0c0a09_100%)]",
    panel:
      "border-amber-300/12 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))]",
    statusBadge: "bg-amber-300/16 text-amber-50",
    tierCardIdle: "bg-amber-300/[0.08] text-white/78 hover:bg-amber-200/[0.14] hover:text-white",
    tierCardActive: "bg-[linear-gradient(135deg,#fde68a,#f59e0b)] text-[#3b2106] shadow-[0_12px_32px_rgba(245,158,11,0.18)]",
    tierPriceActive: "text-[#6a3b08]",
    section: "bg-amber-950/18 border border-amber-300/12",
    infoCard: "border-amber-300/12 bg-black/22",
    infoLabel: "text-amber-100/58",
    accentText: "text-amber-100",
    submitButton: "bg-[linear-gradient(135deg,#fde68a,#f59e0b)] text-[#3b2106] hover:opacity-95"
  },
  tier_4: {
    shell:
      "bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.28),transparent_18%),radial-gradient(circle_at_84%_12%,rgba(217,70,239,0.24),transparent_18%),radial-gradient(circle_at_18%_88%,rgba(76,29,149,0.24),transparent_20%),radial-gradient(circle_at_52%_38%,rgba(91,33,182,0.12),transparent_24%),linear-gradient(180deg,#09040f_0%,#05030a_48%,#020204_100%)]",
    panel:
      "border-fuchsia-400/16 bg-[radial-gradient(circle_at_top,rgba(192,132,252,0.1),transparent_22%),radial-gradient(circle_at_86%_16%,rgba(217,70,239,0.12),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.012))]",
    statusBadge: "bg-fuchsia-400/16 text-fuchsia-50 shadow-[0_0_24px_rgba(192,38,211,0.18)]",
    tierCardIdle: "bg-violet-400/[0.08] text-white/80 hover:bg-fuchsia-400/[0.14] hover:text-white",
    tierCardActive: "bg-[linear-gradient(135deg,#f5d0fe,#c084fc_58%,#7c3aed)] text-white shadow-[0_14px_38px_rgba(168,85,247,0.34),0_0_24px_rgba(217,70,239,0.18)]",
    tierPriceActive: "text-fuchsia-50/90",
    section: "bg-[linear-gradient(180deg,rgba(37,11,61,0.46),rgba(10,6,18,0.78))] border border-fuchsia-400/14",
    infoCard: "border-violet-300/14 bg-[linear-gradient(180deg,rgba(19,10,32,0.92),rgba(8,6,14,0.96))]",
    infoLabel: "text-violet-100/60",
    accentText: "text-fuchsia-50",
    submitButton: "bg-[linear-gradient(135deg,#f0abfc,#a855f7_58%,#6d28d9)] text-white shadow-[0_12px_30px_rgba(168,85,247,0.28)] hover:opacity-95"
  }
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseTier(value: string | string[] | undefined): Tier {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized === "tier_2" || normalized === "tier_3" || normalized === "tier_4"
    ? normalized
    : "tier_1";
}

function parseAmountFromPrice(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(",", ".").match(/\d+(\.\d+)?/);

  if (!normalized) {
    return null;
  }

  const amount = Number(normalized[0]);
  return Number.isFinite(amount) ? amount : null;
}

export default async function TelegramSupportPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireAnyProfile();
  const params = (await searchParams) ?? {};
  const selectedTier = parseTier(params.tier);
  const sentValue = readParam(params.sent);
  const errorValue = readParam(params.error);
  const postSlug = readParam(params.postSlug);
  const postTitle = readParam(params.postTitle);
  const postPrice = readParam(params.postPrice);
  const hasContentAccess = hasClubAccess(profile) || (await hasApprovedPurchasedPosts(profile));
  const support = await getTelegramSupportSettings();
  const tierCards = await getTierLandingCards().catch(() => []);
  const tier = tierCards.find((card) => card.tier === selectedTier) ?? tierCards[0];
  const priceLabel = postPrice ? formatEuroAmount(postPrice) ?? postPrice : tier?.price ?? "";
  const calculatorAmount = parseAmountFromPrice(postPrice ?? tier?.price ?? null) ?? 0;
  const theme = SUPPORT_THEME[selectedTier];
  const requestKind = postSlug ? "post" : "tier";
  const successKind = sentValue === "post" || sentValue === "tier" ? sentValue : sentValue ? requestKind : null;
  const failureKind = errorValue === "post" || errorValue === "tier" ? errorValue : errorValue ? requestKind : null;

  return (
    <MiniAppShell
      profile={profile}
      title={requestKind === "post" ? "Покупка поста" : "Оплата"}
      showHeaderActions={false}
      hasAccess={hasContentAccess}
      shellClassName={theme.shell}
    >
      {successKind ? (
        <section className="rounded-[24px] bg-emerald-400/12 px-4 py-4 text-emerald-50">
          <p className="text-sm font-medium">
            {successKind === "post" ? "Заявка на покупку поста отправлена 💜" : "Заявка на тариф отправлена 💜"}
          </p>
          <p className="mt-1 text-sm text-emerald-100/80">
            {successKind === "post"
              ? "Проверю оплату и открою доступ именно к этому посту."
              : "Проверю оплату и открою доступ к выбранному тарифу вручную."}
          </p>
        </section>
      ) : null}

      {failureKind ? (
        <section className="rounded-[24px] bg-rose-400/12 px-4 py-4 text-sm text-rose-100">
          {failureKind === "post"
            ? "Не удалось отправить заявку на пост. Попробуй ещё раз."
            : "Не удалось отправить заявку на тариф. Попробуй ещё раз."}
        </section>
      ) : null}

      <section className={`rounded-[28px] border px-5 py-5 text-white ${theme.panel}`}>
        <div className="space-y-3">
          <div className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${theme.statusBadge}`}>
            {requestKind === "post" ? "Покупка отдельного поста" : "Оплата доступа"}
          </div>
          <p className="max-w-[34rem] text-sm leading-6 text-white/72">
            {requestKind === "post"
              ? "Оплати этот пост, прикрепи скрин и при желании оставь комментарий. После проверки я открою доступ только к выбранной публикации."
              : "Выбери тариф, оплати доступ, прикрепи скрин и при желании оставь комментарий к заявке. После проверки я открою доступ вручную."}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {requestKind === "tier" ? (
            <section className={`rounded-[24px] px-4 py-4 ${theme.section}`}>
              <p className={`text-[11px] uppercase tracking-[0.22em] ${theme.infoLabel}`}>Тариф</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {tierCards.map((card) => {
                  const active = card.tier === selectedTier;

                  return (
                    <form key={card.tier} method="get" action="/tg/support">
                      <input type="hidden" name="tier" value={card.tier} />
                      <button
                        type="submit"
                        className={`w-full rounded-[16px] px-3 py-3 text-left text-sm transition ${
                          active ? theme.tierCardActive : theme.tierCardIdle
                        }`}
                      >
                        <span className="block font-medium">{card.label}</span>
                        <span className={`mt-1 block text-xs ${active ? theme.tierPriceActive : theme.infoLabel}`}>
                          {card.price}
                        </span>
                      </button>
                    </form>
                  );
                })}
              </div>

              <h2 className={`mt-4 font-display text-[1.5rem] leading-none ${theme.accentText}`}>{tier?.label ?? "Тариф"}</h2>
              <p className={`mt-3 text-lg font-medium ${theme.accentText}`}>{priceLabel}</p>
              {tier?.teaser ? <p className="mt-2 text-sm text-white/60">{tier.teaser}</p> : null}
            </section>
          ) : (
            <section className={`rounded-[24px] px-4 py-4 ${theme.section}`}>
              <p className={`text-[11px] uppercase tracking-[0.22em] ${theme.infoLabel}`}>Покупка поста</p>
              <div className={`mt-3 rounded-[18px] border px-4 py-4 ${theme.infoCard}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={`text-[11px] uppercase tracking-[0.22em] ${theme.infoLabel}`}>Пост</p>
                    <h2 className={`mt-2 font-display text-[1.5rem] leading-none ${theme.accentText}`}>
                      {postTitle ?? "Публикация"}
                    </h2>
                    {tier?.label ? <p className="mt-2 text-sm text-white/60">Уровень поста: {tier.label}</p> : null}
                  </div>
                  <div className="rounded-[18px] border border-fuchsia-300/18 bg-fuchsia-400/10 px-4 py-3 text-right">
                    <p className={`text-[11px] uppercase tracking-[0.22em] ${theme.infoLabel}`}>Цена</p>
                    <p className={`mt-2 text-xl font-semibold ${theme.accentText}`}>{priceLabel}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className={`rounded-[24px] px-4 py-4 ${theme.section}`}>
            <p className={`text-[11px] uppercase tracking-[0.22em] ${theme.infoLabel}`}>Реквизиты</p>
            <div className={`mt-3 min-h-[88px] rounded-[18px] px-4 py-3 ${theme.infoCard}`}>
              <div className="space-y-3">
                {support.methods.map((method) => (
                  <div key={method.id} className={`rounded-[16px] border px-3 py-3 ${theme.infoCard}`}>
                    <p className={`text-sm ${theme.infoLabel}`}>{method.label}</p>
                    {method.value ? <p className={`mt-1 break-all font-mono text-base ${theme.accentText}`}>{method.value}</p> : null}
                    {method.note ? <p className={`mt-2 text-sm leading-6 ${theme.infoLabel}`}>{method.note}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {calculatorAmount > 0 ? (
            <CurrencyCalculator
              initialAmount={calculatorAmount}
              sectionClassName={theme.section}
              infoCardClassName={theme.infoCard}
              infoLabelClassName={theme.infoLabel}
              accentTextClassName={theme.accentText}
            />
          ) : null}

          <section className={`rounded-[24px] px-4 py-4 ${theme.section}`}>
            <p className={`text-[11px] uppercase tracking-[0.22em] ${theme.infoLabel}`}>
              {requestKind === "post" ? "Заявка на пост" : "Заявка на тариф"}
            </p>

            <SupportRequestForm
              tier={selectedTier}
              requestKind={requestKind}
              postSlug={postSlug ?? undefined}
              postTitle={postTitle ?? undefined}
              postPrice={postPrice ?? undefined}
              textareaPlaceholder={requestKind === "post" ? "Комментарий к покупке поста" : "Комментарий к заявке на тариф"}
              submitLabel={requestKind === "post" ? "Отправить заявку на пост" : "Отправить заявку на тариф"}
              infoCardClassName={theme.infoCard}
              infoLabelClassName={theme.infoLabel}
              accentTextClassName={theme.accentText}
              submitButtonClassName={theme.submitButton}
            />
          </section>
        </div>
      </section>
    </MiniAppShell>
  );
}
