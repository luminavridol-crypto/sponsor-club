import { z } from "zod";
import type { TierAccordionCard } from "@/components/tiers/tier-accordion-list";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Tier } from "@/lib/types";

type TierLandingSection = {
  title?: string;
  label?: string;
  icon?: "star" | "spark" | "crown" | "moon" | "flame" | "diamond" | "message" | "vote" | "stream" | "gift" | "status" | "dot";
  titleClassName?: string;
  sectionClassName?: string;
  items: string[];
};

type TierLandingContent = {
  label: string;
  level: string;
  price: string;
  teaser: string;
  description?: string | null;
  statusBadge?: string | null;
  noteBadge?: string | null;
  sections: TierLandingSection[];
};

type TierLandingContentRow = {
  tier: Tier;
  content: Record<string, unknown> | null;
};

const tierLandingSectionSchema: z.ZodType<TierLandingSection> = z.object({
  title: z.string().optional(),
  label: z.string().optional(),
  icon: z
    .enum([
      "star",
      "spark",
      "crown",
      "moon",
      "flame",
      "diamond",
      "message",
      "vote",
      "stream",
      "gift",
      "status",
      "dot"
    ])
    .optional(),
  titleClassName: z.string().optional(),
  sectionClassName: z.string().optional(),
  items: z.array(z.string().trim().min(1)).min(1)
});

const tierLandingContentSchema = z.object({
  label: z.string().trim().min(2),
  level: z.string().trim().min(2),
  price: z.string().trim().min(2),
  teaser: z.string().trim().min(2),
  description: z.string().trim().optional().nullable(),
  statusBadge: z.string().trim().optional().nullable(),
  noteBadge: z.string().trim().optional().nullable(),
  sections: z.array(tierLandingSectionSchema).min(1)
});

const DEFAULT_CONTENT: Record<Tier, TierLandingContent> = {
  tier_1: {
    label: 'Тариф "Спутник"',
    level: "Уровень доступа: базовый",
    price: "10 EUR / месяц",
    teaser: "Вход в закрытый мир, ранний доступ и первые эксклюзивы.",
    sections: [
      {
        title: "Что входит",
        label: "early access",
        icon: "star",
        items: [
          "Ранний доступ к фото и видео",
          "Закулисные материалы и спойлеры",
          "Дополнительные кадры вне соцсетей",
          "Лор персонажей и заметки по проектам"
        ]
      }
    ]
  },
  tier_2: {
    label: "Тариф Insider",
    level: "Уровень доступа: расширенный",
    price: "25 EUR / месяц",
    teaser: "Больше процесса, больше backstage и ближе контакт с тем, что создаётся.",
    sections: [
      {
        title: "Что входит",
        label: "core access",
        icon: "spark",
        items: [
          "Всё из тарифа Спутник",
          "Возможность писать в личные сообщения Telegram",
          "Участие в закрытых голосованиях",
          "Записи стримов и больше backstage"
        ]
      },
      {
        title: "Ежемесячные бонусы",
        label: "monthly drops",
        icon: "gift",
        items: [
          "Бонусный контент и сливы",
          "Обои для телефона",
          "ИИ-арты по пожеланию",
          "Один контент-запрос в месяц"
        ]
      }
    ]
  },
  tier_3: {
    label: 'Тариф "VIP"',
    level: "Уровень доступа: максимальный",
    price: "50 EUR / месяц",
    teaser: "Премиальный уровень для тех, кто хочет максимум внимания и максимум материалов.",
    statusBadge: "RECOMMENDED",
    noteBadge: "MOST POPULAR",
    sections: [
      {
        title: "Что входит",
        label: "premium access",
        icon: "crown",
        items: [
          "Всё из предыдущих уровней",
          "Эксклюзивные мини-серии и скетчи",
          "Голосовые сообщения и совместные игры",
          "Персональные пожелания и поздравления"
        ]
      },
      {
        title: "Влияние на проект",
        label: "priority vote",
        icon: "vote",
        items: [
          "Приоритет в голосованиях",
          "Больше контента по запросу",
          "Возможность предлагать идеи для будущих сюжетов",
          "Приоритет среди подписчиков"
        ]
      }
    ]
  },
  tier_4: {
    label: "After Dark",
    level: "Уровень доступа: самый закрытый",
    price: "80 EUR / месяц",
    teaser: "Самая смелая сторона Люмины. Самый тёмный и самый закрытый уровень доступа.",
    statusBadge: "UNLOCK THE DARK SIDE",
    noteBadge: "EXCLUSIVE ACCESS",
    sections: [
      {
        title: "Что войдёт",
        label: "restricted archive",
        icon: "moon",
        items: [
          "Все материалы по пилону",
          "Фото и видео тренировок",
          "Танцевальные связки и постановки",
          "Закулисье занятий",
          "Подготовка к тренировкам",
          "Прогресс обучения от первого занятия",
          "Неудачные дубли и забавные моменты",
          "Эксклюзивные эдиты"
        ]
      },
      {
        title: "Более смелый контент",
        label: "uncut archive",
        icon: "flame",
        items: [
          "Более смелые фотосеты",
          "Более смелые образы",
          "Дополнительные материалы со съёмок",
          "Эксклюзивные backstage-видео"
        ]
      },
      {
        title: "Дневник развития",
        label: "private process",
        icon: "diamond",
        items: [
          "Личный путь освоения пилона",
          "Цели, достижения и результаты",
          "Подготовка номеров",
          "Отработка элементов",
          "Всё, что остаётся за кадром основной аудитории"
        ]
      },
      {
        title: "Статус",
        label: "night rank",
        icon: "status",
        items: [
          "Особый статус в сообществе [Dark VIP] + уровень",
          "Максимальный приоритет среди всех уровней подписки",
          "Самые ранние анонсы новых проектов",
          "Доступ ко всем будущим экспериментальным форматам",
          "Косплей + пилон"
        ]
      }
    ]
  }
};

const DEFAULT_CARD_STYLE: Record<
  Tier,
  Pick<
    TierAccordionCard,
    | "accentClass"
    | "glowClass"
    | "sectionTitleClass"
    | "sectionCardClass"
    | "headerBadgeClass"
    | "statusBadgeClass"
    | "afterDarkAtmosphere"
    | "symbol"
  >
> = {
  tier_1: {
    symbol: "star",
    accentClass:
      "border-slate-200/18 bg-[radial-gradient(circle_at_top,rgba(226,232,240,0.18),transparent_30%),radial-gradient(circle_at_bottom,rgba(125,211,252,0.12),transparent_36%),linear-gradient(180deg,rgba(22,22,31,0.96),rgba(11,13,20,0.98))]",
    glowClass: "shadow-[0_0_26px_rgba(203,213,225,0.18),0_16px_55px_rgba(56,189,248,0.10)]",
    sectionTitleClass: "text-slate-100",
    sectionCardClass: "border-slate-200/10 bg-[linear-gradient(180deg,rgba(226,232,240,0.06),rgba(15,23,42,0.16))]",
    headerBadgeClass: "border-slate-200/10 bg-black/20 text-slate-200/60",
    statusBadgeClass: undefined,
    afterDarkAtmosphere: false
  },
  tier_2: {
    symbol: "spark",
    accentClass:
      "border-fuchsia-300/22 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.16),transparent_30%),linear-gradient(180deg,rgba(28,12,34,0.97),rgba(13,10,24,0.98))]",
    glowClass: "shadow-[0_0_28px_rgba(217,70,239,0.22),0_16px_58px_rgba(236,72,153,0.10)]",
    sectionTitleClass: "text-fuchsia-200",
    sectionCardClass: "border-fuchsia-300/14 bg-[linear-gradient(180deg,rgba(217,70,239,0.08),rgba(255,255,255,0.03))]",
    headerBadgeClass: "border-fuchsia-300/12 bg-black/20 text-fuchsia-100/65",
    statusBadgeClass: undefined,
    afterDarkAtmosphere: false
  },
  tier_3: {
    symbol: "crown",
    accentClass:
      "border-amber-300/34 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.26),transparent_28%),radial-gradient(circle_at_right,rgba(249,115,22,0.18),transparent_28%),linear-gradient(180deg,rgba(36,20,10,0.98),rgba(20,10,7,1))]",
    glowClass: "shadow-[0_0_36px_rgba(251,191,36,0.34),0_16px_65px_rgba(249,115,22,0.20)]",
    sectionTitleClass: "text-amber-100",
    sectionCardClass: "border-amber-300/16 bg-[linear-gradient(180deg,rgba(251,191,36,0.09),rgba(255,255,255,0.03))]",
    headerBadgeClass: "border-amber-300/14 bg-black/20 text-amber-100/70",
    statusBadgeClass: "border border-amber-300/30 bg-amber-300/12 text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.16)]",
    afterDarkAtmosphere: false
  },
  tier_4: {
    symbol: "moon",
    accentClass:
      "border-violet-400/34 bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.22),transparent_20%),radial-gradient(circle_at_20%_90%,rgba(91,33,182,0.20),transparent_28%),radial-gradient(circle_at_85%_22%,rgba(217,70,239,0.14),transparent_18%),linear-gradient(180deg,rgba(4,4,7,0.99),rgba(2,2,4,1))]",
    glowClass: "shadow-[0_0_48px_rgba(139,92,246,0.28),0_0_84px_rgba(76,29,149,0.24),0_20px_80px_rgba(0,0,0,0.7)]",
    sectionTitleClass: "text-violet-100",
    sectionCardClass: "border-violet-400/16 bg-[linear-gradient(180deg,rgba(139,92,246,0.09),rgba(0,0,0,0.26))]",
    headerBadgeClass: "border-violet-300/18 bg-black/30 text-violet-100/72",
    statusBadgeClass: "border border-violet-300/26 bg-violet-400/12 text-violet-100 shadow-[0_0_22px_rgba(139,92,246,0.18)]",
    afterDarkAtmosphere: true
  }
};

function cloneDefaultContent(): Record<Tier, TierLandingContent> {
  return {
    tier_1: structuredClone(DEFAULT_CONTENT.tier_1),
    tier_2: structuredClone(DEFAULT_CONTENT.tier_2),
    tier_3: structuredClone(DEFAULT_CONTENT.tier_3),
    tier_4: structuredClone(DEFAULT_CONTENT.tier_4)
  };
}

function mergeContent(base: TierLandingContent, override: Partial<TierLandingContent> | null | undefined) {
  if (!override) {
    return base;
  }

  return {
    ...base,
    ...override,
    sections: Array.isArray(override.sections) && override.sections.length ? override.sections : base.sections
  };
}

export function buildTierLandingCards(overrides?: Partial<Record<Tier, Partial<TierLandingContent>>>) {
  const contentMap = cloneDefaultContent();

  if (overrides) {
    (Object.keys(overrides) as Tier[]).forEach((tier) => {
      contentMap[tier] = mergeContent(contentMap[tier], overrides[tier]);
    });
  }

  return (["tier_1", "tier_2", "tier_3", "tier_4"] as Tier[]).map((tier, index) => {
    const content = contentMap[tier];
    const styles = DEFAULT_CARD_STYLE[tier];

    return {
      id: `tier-${index + 1}`,
      tier,
      badge: `tier 0${index + 1}`,
      label: content.label,
      level: content.level,
      price: content.price,
      teaser: content.teaser,
      description: content.description ?? undefined,
      symbol: styles.symbol,
      statusBadge: content.statusBadge ?? undefined,
      noteBadge: content.noteBadge ?? undefined,
      accentClass: styles.accentClass,
      glowClass: styles.glowClass,
      sectionTitleClass: styles.sectionTitleClass,
      sectionCardClass: styles.sectionCardClass,
      headerBadgeClass: styles.headerBadgeClass,
      statusBadgeClass: styles.statusBadgeClass,
      afterDarkAtmosphere: styles.afterDarkAtmosphere,
      sections: content.sections
    } satisfies TierAccordionCard;
  });
}

export async function getTierLandingCards() {
  const defaults = cloneDefaultContent();

  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.from("tier_landing_content").select("tier, content");

    if (error || !data) {
      return buildTierLandingCards();
    }

    for (const row of data as TierLandingContentRow[]) {
      const parsed = tierLandingContentSchema.safeParse(row.content);
      if (parsed.success) {
        defaults[row.tier] = parsed.data;
      }
    }
  } catch {
    return buildTierLandingCards();
  }

  return buildTierLandingCards(defaults);
}

export async function getTierLandingCard(tier: Tier) {
  const cards = await getTierLandingCards();
  return cards.find((card) => card.tier === tier) ?? cards[0];
}

export async function saveTierLandingContent(
  tier: Tier,
  content: TierLandingContent,
  updatedBy: string | null
) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("tier_landing_content").upsert(
    {
      tier,
      content,
      updated_by: updatedBy,
      updated_at: new Date().toISOString()
    },
    { onConflict: "tier" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export type { TierLandingContent, TierLandingSection };
