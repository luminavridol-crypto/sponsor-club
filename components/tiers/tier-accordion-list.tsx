"use client";

import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { ReactNode, useState } from "react";
import { updateTierLandingAction } from "@/app/actions";
import {
  ADMIN_BUTTON_PRIMARY_CLASS,
  ADMIN_INPUT_CLASS,
  ADMIN_TEXTAREA_CLASS
} from "@/components/admin/theme";
import { Tier } from "@/lib/types";
import { TIER_EMBLEMS } from "@/lib/ui/tier-emblems";
import { formatEuroAmount } from "@/lib/utils/money";

type IconName =
  | "star"
  | "spark"
  | "crown"
  | "moon"
  | "flame"
  | "diamond"
  | "message"
  | "vote"
  | "stream"
  | "gift"
  | "status"
  | "dot";

type TierSection = {
  title?: string;
  label?: string;
  icon?: IconName;
  titleClassName?: string;
  sectionClassName?: string;
  items: string[];
};

export type TierAccordionCard = {
  id: string;
  tier: Tier;
  badge: string;
  label: string;
  level: string;
  price: string;
  teaser: string;
  description?: string;
  symbol: IconName;
  symbolText?: string;
  statusBadge?: string;
  noteBadge?: string;
  accentClass: string;
  glowClass: string;
  sectionTitleClass?: string;
  sectionCardClass?: string;
  headerBadgeClass?: string;
  statusBadgeClass?: string;
  afterDarkAtmosphere?: boolean;
  sections: TierSection[];
};

type PaymentContext = {
  postSlug?: string;
  postTitle?: string;
  postPrice?: string;
};

function parseSectionsText(card: TierAccordionCard) {
  return JSON.stringify(card.sections, null, 2);
}

function LuminaIcon({ name, className }: { name: IconName; className?: string }) {
  const shared = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className
  };

  const icons: Record<IconName, ReactNode> = {
    star: (
      <svg {...shared}>
        <path d="M12 3.8l2.1 4.4 4.9.7-3.6 3.5.9 5-4.3-2.3-4.3 2.3.9-5L5 8.9l4.9-.7L12 3.8z" />
      </svg>
    ),
    spark: (
      <svg {...shared}>
        <path d="M12 3v5" />
        <path d="M12 16v5" />
        <path d="M3 12h5" />
        <path d="M16 12h5" />
        <path d="M6 6l3 3" />
        <path d="M15 15l3 3" />
        <path d="M6 18l3-3" />
        <path d="M15 9l3-3" />
      </svg>
    ),
    crown: (
      <svg {...shared}>
        <path d="M4 18l1.2-8 4.3 3 2.5-6 2.5 6 4.3-3L20 18H4z" />
        <path d="M6.2 21h11.6" />
      </svg>
    ),
    moon: (
      <svg {...shared}>
        <path d="M18.5 14.8A8 8 0 0 1 9.2 5.5a8.5 8.5 0 1 0 9.3 9.3z" />
      </svg>
    ),
    flame: (
      <svg {...shared}>
        <path d="M12.4 3.8c1.2 3-1.5 4.4-1 6.8.2 1.3 1.6 2.1 2.8 2.1 1.7 0 3-1.1 3-3.5 2.3 2.1 3.5 4.5 3.5 6.9A7.2 7.2 0 0 1 12 23a7.2 7.2 0 0 1-8.7-6.9c0-3.6 2.2-6.4 5.8-8.7-.4 2.5.7 4 2.1 4 1 0 2-.9 2-2.4 0-1.5-.9-2.8-.8-5.2z" />
      </svg>
    ),
    diamond: (
      <svg {...shared}>
        <path d="M8 4h8l4 5-8 11L4 9l4-5z" />
        <path d="M9 4l3 16 3-16" />
        <path d="M4 9h16" />
      </svg>
    ),
    message: (
      <svg {...shared}>
        <path d="M5 6.5h14A1.5 1.5 0 0 1 20.5 8v8a1.5 1.5 0 0 1-1.5 1.5H9L4.5 20v-4H5A1.5 1.5 0 0 1 3.5 14.5V8A1.5 1.5 0 0 1 5 6.5z" />
      </svg>
    ),
    vote: (
      <svg {...shared}>
        <path d="M6 7.5h12" />
        <path d="M6 12h8" />
        <path d="M6 16.5h10" />
        <path d="M4 7.5h.01" />
        <path d="M4 12h.01" />
        <path d="M4 16.5h.01" />
      </svg>
    ),
    stream: (
      <svg {...shared}>
        <rect x="4" y="5" width="16" height="12" rx="3" />
        <path d="M10 9.5l4 1.9-4 1.9V9.5z" />
        <path d="M8 19.5h8" />
      </svg>
    ),
    gift: (
      <svg {...shared}>
        <path d="M4.5 10.5h15v9H4.5z" />
        <path d="M12 10.5v9" />
        <path d="M3.5 7.5h17v3h-17z" />
        <path d="M12 7.5c0-2.2-1.2-3.5-2.8-3.5-1.5 0-2.7 1.2-2.7 2.6 0 1.6 1.2 2.4 3.1 2.4H12z" />
        <path d="M12 7.5c0-2.2 1.2-3.5 2.8-3.5 1.5 0 2.7 1.2 2.7 2.6 0 1.6-1.2 2.4-3.1 2.4H12z" />
      </svg>
    ),
    status: (
      <svg {...shared}>
        <path d="M12 4.5l7 3.2v4.6c0 4.3-2.8 7.3-7 8.7-4.2-1.4-7-4.4-7-8.7V7.7L12 4.5z" />
        <path d="M9.3 12.3l1.8 1.9 3.6-4.1" />
      </svg>
    ),
    dot: (
      <svg {...shared}>
        <circle cx="12" cy="12" r="3.1" fill="currentColor" stroke="none" />
      </svg>
    )
  };

  return icons[name];
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

const particles = [
  { left: "7%", top: "7%", size: "0.34rem", delay: "0s", opacity: 0.22 },
  { left: "16%", top: "15%", size: "0.22rem", delay: "1.1s", opacity: 0.18 },
  { left: "83%", top: "11%", size: "0.28rem", delay: "0.7s", opacity: 0.2 },
  { left: "75%", top: "20%", size: "0.18rem", delay: "1.7s", opacity: 0.16 },
  { left: "11%", top: "35%", size: "0.24rem", delay: "0.4s", opacity: 0.18 },
  { left: "92%", top: "41%", size: "0.32rem", delay: "1.3s", opacity: 0.24 },
  { left: "15%", top: "70%", size: "0.22rem", delay: "0.8s", opacity: 0.18 },
  { left: "86%", top: "78%", size: "0.26rem", delay: "1.9s", opacity: 0.2 }
];

const itemIconMap = new Map<string, IconName>([
  ["⭐", "star"],
  ["✨", "spark"],
  ["🌙", "moon"],
  ["🔥", "flame"],
  ["💎", "diamond"],
  ["👑", "crown"],
  ["📩", "message"],
  ["💬", "message"],
  ["📺", "stream"],
  ["🧨", "flame"],
  ["💡", "spark"],
  ["🩸", "status"],
  ["🎮", "stream"],
  ["🎬", "stream"],
  ["🎭", "spark"],
  ["📖", "diamond"],
  ["🎥", "stream"],
  ["🎂", "gift"],
  ["🗳", "vote"],
  ["📱", "spark"],
  ["🎨", "spark"],
  ["🔹", "dot"],
  ["👁", "moon"]
]);

function splitLeadMarker(value: string) {
  const marker = Array.from(itemIconMap.keys()).find((candidate) => value.startsWith(candidate));

  if (!marker) {
    return { icon: "dot" as IconName, text: value };
  }

  return {
    icon: itemIconMap.get(marker) ?? "dot",
    text: value.slice(marker.length).trim()
  };
}

function TierEditModal({
  card,
  onClose
}: {
  card: TierAccordionCard;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-3 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#161821] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.45)] sm:p-5">
        <form action={updateTierLandingAction} className="space-y-4">
          <input type="hidden" name="tier" value={card.tier} />

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Admin</p>
              <h3 className="mt-1 font-display text-[1.2rem] text-white">Редактирование тарифа</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/65">
                {card.badge}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/70 transition hover:border-white/16 hover:bg-white/[0.05] hover:text-white"
              >
                Закрыть
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-white/45">Название</label>
              <input name="label" defaultValue={card.label} className={ADMIN_INPUT_CLASS} />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-white/45">Уровень</label>
              <input name="level" defaultValue={card.level} className={ADMIN_INPUT_CLASS} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-white/45">Описание</label>
              <textarea name="teaser" rows={4} defaultValue={card.teaser} className={ADMIN_TEXTAREA_CLASS} />
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.18em] text-white/45">Цена</label>
                <input name="price" defaultValue={card.price} className={ADMIN_INPUT_CLASS} />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.18em] text-white/45">Бейдж</label>
                <input name="statusBadge" defaultValue={card.statusBadge ?? ""} className={ADMIN_INPUT_CLASS} />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.18em] text-white/45">Подпись</label>
                <input name="noteBadge" defaultValue={card.noteBadge ?? ""} className={ADMIN_INPUT_CLASS} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.18em] text-white/45">Дополнительный текст</label>
            <textarea name="description" rows={3} defaultValue={card.description ?? ""} className={ADMIN_TEXTAREA_CLASS} />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.18em] text-white/45">Секции JSON</label>
            <textarea
              name="sectionsJson"
              rows={14}
              defaultValue={parseSectionsText(card)}
              className={`${ADMIN_TEXTAREA_CLASS} font-mono text-[12px] leading-5`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[38rem] text-xs leading-5 text-white/42">
              Меняются только тексты и блоки. Карточка и визуальный стиль остаются на месте.
            </p>
            <button className={ADMIN_BUTTON_PRIMARY_CLASS}>Сохранить тариф</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TierAccordionList({
  cards,
  isAdmin = false,
  initialOpenTier,
  paymentContext,
  showPaymentButton = true,
  paymentButtonLabel = "Оплатить",
  paymentHrefBuilder
}: {
  cards: TierAccordionCard[];
  isAdmin?: boolean;
  initialOpenTier?: Tier;
  paymentContext?: PaymentContext;
  showPaymentButton?: boolean;
  paymentButtonLabel?: string;
  paymentHrefBuilder?: (tier: Tier) => string;
}) {
  const [openId, setOpenId] = useState<string>(() => cards.find((card) => card.tier === initialOpenTier)?.id ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingCard = cards.find((card) => card.id === editingId) ?? null;

  return (
    <>
      <div className="relative space-y-3">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full overflow-hidden">
          {particles.map((particle, index) => (
            <span
              key={`${particle.left}-${particle.top}-${index}`}
              className="lumina-particle absolute rounded-full bg-white blur-[1px]"
              style={{
                left: particle.left,
                top: particle.top,
                width: particle.size,
                height: particle.size,
                opacity: particle.opacity,
                animationDelay: particle.delay
              }}
            />
          ))}
        </div>

        {cards.map((card) => {
          const isOpen = openId === card.id;
          const paymentHref =
            paymentHrefBuilder?.(card.tier) ??
            `/tg/support?tier=${card.tier}${
            paymentContext?.postSlug ? `&postSlug=${encodeURIComponent(paymentContext.postSlug)}` : ""
          }${
            paymentContext?.postTitle ? `&postTitle=${encodeURIComponent(paymentContext.postTitle)}` : ""
          }${paymentContext?.postPrice ? `&postPrice=${encodeURIComponent(paymentContext.postPrice)}` : ""}`;

          return (
            <article
              key={card.id}
              data-tier-card={card.tier}
              className={`group relative overflow-hidden rounded-[24px] border backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:shadow-[0_22px_70px_rgba(0,0,0,0.38)] ${card.accentClass} ${
                isOpen ? card.glowClass : "shadow-[0_18px_52px_rgba(0,0,0,0.24)]"
              }`}
            >
              <div className="pointer-events-none absolute inset-0 opacity-90">
                <div className="absolute -left-10 top-8 h-20 w-20 rounded-full bg-white/5 blur-3xl" />
                <div className="absolute -right-6 bottom-10 h-24 w-24 rounded-full bg-white/5 blur-3xl" />
                <div className="tier-accordion-watermark absolute right-3 top-3 h-24 w-24 overflow-hidden rounded-full border border-white/10 opacity-32 shadow-[0_0_28px_rgba(255,255,255,0.12)] transition duration-500 group-hover:scale-105 group-hover:opacity-48 sm:h-32 sm:w-32">
                  <Image
                    src={TIER_EMBLEMS[card.tier]}
                    alt=""
                    width={160}
                    height={160}
                    className="h-full w-full object-cover"
                  />
                </div>

                {card.afterDarkAtmosphere ? (
                  <>
                    <div className="lumina-mist absolute inset-x-[-10%] top-[18%] h-24 rounded-full bg-violet-400/10 blur-3xl" />
                    <div
                      className="lumina-mist absolute inset-x-[-6%] bottom-[16%] h-28 rounded-full bg-fuchsia-500/8 blur-[58px]"
                      style={{ animationDelay: "1.4s" }}
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_18%,rgba(167,139,250,0.10),transparent_18%),radial-gradient(circle_at_30%_75%,rgba(76,29,149,0.22),transparent_22%)]" />
                  </>
                ) : null}
              </div>

              <div className="relative z-10 flex items-start gap-3 px-3.5 py-3.5 sm:px-5 sm:py-5">
                <button
                  type="button"
                  onClick={() => setOpenId((current) => (current === card.id ? "" : card.id))}
                  className="flex-1 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.24em] ${
                          card.headerBadgeClass ?? "border-white/10 bg-black/20 text-white/50"
                        }`}
                      >
                        {card.badge}
                      </span>
                      {card.statusBadge ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${
                            card.statusBadgeClass ?? "border border-white/15 bg-white/10 text-white/80"
                          }`}
                        >
                          {card.statusBadge}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <div className="tier-accordion-emblem h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/24 bg-black/30 shadow-[0_0_24px_rgba(255,255,255,0.16)] sm:h-20 sm:w-20">
                            <Image
                              src={TIER_EMBLEMS[card.tier]}
                              alt=""
                              width={96}
                              height={96}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <h2 className="font-display text-[1.15rem] leading-[1.02] text-white sm:text-[1.9rem]">
                              {card.label}
                            </h2>
                            <p className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-white/45 sm:text-xs sm:tracking-[0.22em]">
                              {card.level}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 pt-0.5 text-right">
                        <p className="font-display text-[1rem] leading-none text-white sm:text-[1.9rem]">
                          {card.price}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 max-w-[32rem] text-[0.92rem] leading-5 text-white/78 sm:text-[0.96rem] sm:leading-6">
                      {card.teaser}
                    </p>
                    {card.description ? (
                      <p className="mt-2 max-w-[32rem] text-[0.92rem] leading-6 text-white/62 sm:text-[0.96rem]">
                        {card.description}
                      </p>
                    ) : null}
                    {card.noteBadge ? (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/62">
                        <LuminaIcon name={card.symbol} className="h-3 w-3" />
                        <span>{card.noteBadge}</span>
                      </div>
                    ) : null}
                  </div>
                </button>

                <div className="mt-1 flex shrink-0 items-center gap-2">
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setEditingId(card.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/82 transition hover:border-white/20 hover:bg-white/8"
                      aria-label={`Редактировать ${card.label}`}
                      title="Редактировать"
                    >
                      <PencilIcon />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setOpenId((current) => (current === card.id ? "" : card.id))}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/20 text-lg text-white/82 transition duration-300 ${
                      isOpen ? "rotate-45 border-white/20 bg-white/10" : "group-hover:border-white/20 group-hover:bg-white/8"
                    }`}
                    aria-label={isOpen ? "Свернуть тариф" : "Раскрыть тариф"}
                    title={isOpen ? "Свернуть тариф" : "Раскрыть тариф"}
                  >
                    +
                  </button>
                </div>
              </div>

              <div
                className={`grid transition-all duration-500 ease-out ${
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="lumina-rise relative z-10 border-t border-white/10 px-3.5 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
                    <div className="space-y-4">
                      {card.sections.map((section, index) => (
                        <section key={`${card.id}-${index}`} className="space-y-2.5">
                          {section.title ? (
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-black/20 text-white/92">
                                <LuminaIcon name={section.icon ?? "spark"} className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                {section.label ? (
                                  <p className="text-[9px] uppercase tracking-[0.18em] text-white/36">
                                    {section.label}
                                  </p>
                                ) : null}
                                <h3
                                  className={`text-[0.92rem] font-semibold sm:text-[0.96rem] ${
                                    section.titleClassName ?? card.sectionTitleClass ?? "text-fuchsia-200"
                                  }`}
                                >
                                  {section.title}
                                </h3>
                              </div>
                            </div>
                          ) : null}

                          <div
                            className={`rounded-[18px] border px-3 py-3 transition duration-300 hover:shadow-[0_14px_30px_rgba(0,0,0,0.18)] sm:px-4 sm:py-3.5 ${
                              section.sectionClassName ??
                              card.sectionCardClass ??
                              "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))]"
                            }`}
                          >
                            <div className="space-y-2">
                              {section.items.map((item, itemIndex) => {
                                const { icon, text } = splitLeadMarker(item);

                                return (
                                  <div
                                    key={`${item}-${itemIndex}`}
                                    className="flex gap-2.5 border-b border-white/6 pb-2 text-[0.9rem] leading-5 text-white/80 last:border-b-0 last:pb-0"
                                  >
                                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/92">
                                      <LuminaIcon name={icon} className="h-3 w-3" />
                                    </span>
                                    <span className="min-w-0">{text}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </section>
                      ))}

                      {paymentContext?.postTitle ? (
                        <div className="rounded-[20px] border border-fuchsia-300/15 bg-fuchsia-400/10 px-4 py-3 text-sm text-fuchsia-50">
                          <p>
                            Оплата для поста: <span className="font-medium text-white">{paymentContext.postTitle}</span>
                          </p>
                          {paymentContext.postPrice ? (
                            <p className="mt-2 text-white/88">
                              Цена поста: {formatEuroAmount(paymentContext.postPrice) ?? paymentContext.postPrice}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {showPaymentButton ? (
                        <Link
                          href={paymentHref as Route}
                          className="flex w-full items-center justify-center rounded-[20px] border border-white/16 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/28 hover:bg-white/14"
                        >
                          {paymentContext?.postTitle ? "Открыть оплату" : paymentButtonLabel}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {isAdmin && editingCard ? <TierEditModal card={editingCard} onClose={() => setEditingId(null)} /> : null}
    </>
  );
}
