export const dynamic = "force-dynamic";

import { TierAccordionList, type TierAccordionCard } from "@/components/tiers/tier-accordion-list";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { requireAnyProfile } from "@/lib/auth/guards";

const tierCards: TierAccordionCard[] = [
  {
    id: "sputnik",
    badge: "tier 01",
    label: 'Тариф "Спутник"',
    level: "Уровень доступа: базовый",
    price: "10 EUR / месяц",
    teaser: "Вход в закрытый мир. Смотри первым.",
    symbol: "star",
    noteBadge: "FIRST STEP",
    accentClass:
      "border-slate-200/18 bg-[radial-gradient(circle_at_top,rgba(226,232,240,0.18),transparent_30%),radial-gradient(circle_at_bottom,rgba(125,211,252,0.12),transparent_36%),linear-gradient(180deg,rgba(22,22,31,0.96),rgba(11,13,20,0.98))]",
    glowClass: "shadow-[0_0_26px_rgba(203,213,225,0.18),0_16px_55px_rgba(56,189,248,0.10)]",
    sectionTitleClass: "text-slate-100 drop-shadow-[0_0_12px_rgba(226,232,240,0.26)]",
    sectionCardClass:
      "border-slate-200/10 bg-[linear-gradient(180deg,rgba(226,232,240,0.06),rgba(15,23,42,0.16))]",
    headerBadgeClass: "border-slate-200/10 bg-black/20 text-slate-200/60",
    sections: [
      {
        title: "Основные привилегии",
        label: "early access",
        icon: "star",
        titleClassName: "text-slate-100 drop-shadow-[0_0_12px_rgba(226,232,240,0.28)]",
        items: [
          "🔹 Ранний доступ к фото и видео",
          "🔹 Закулисные материалы создания контента",
          "🔹 Дополнительные кадры, не попадающие в соцсети",
          "🔹 Спойлеры будущих проектов",
          "🔹 Лор персонажей и информация по проектам"
        ]
      }
    ]
  },
  {
    id: "insider",
    badge: "tier 02",
    label: "Тариф Insider",
    level: "Уровень доступа: расширенный",
    price: "25 EUR",
    teaser: "Больше, чем зритель. Ты ближе к процессу и закулисью.",
    symbol: "spark",
    noteBadge: "INNER CIRCLE",
    accentClass:
      "border-fuchsia-300/22 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.16),transparent_30%),linear-gradient(180deg,rgba(28,12,34,0.97),rgba(13,10,24,0.98))]",
    glowClass: "shadow-[0_0_28px_rgba(217,70,239,0.22),0_16px_58px_rgba(236,72,153,0.10)]",
    sectionTitleClass: "text-fuchsia-200 drop-shadow-[0_0_14px_rgba(217,70,239,0.44)]",
    sectionCardClass:
      "border-fuchsia-300/14 bg-[linear-gradient(180deg,rgba(217,70,239,0.08),rgba(255,255,255,0.03))]",
    headerBadgeClass: "border-fuchsia-300/12 bg-black/20 text-fuchsia-100/65",
    sections: [
      {
        title: "Основные привилегии",
        label: "core access",
        icon: "spark",
        titleClassName: "text-fuchsia-200 drop-shadow-[0_0_14px_rgba(217,70,239,0.4)]",
        items: [
          'Включает всё из тарифа "Спутник"',
          "📩 Возможность писать мне в личные сообщения Telegram (текст)",
          "💬 Участие в закрытых голосованиях"
        ]
      },
      {
        title: "TikTok и стримы",
        label: "extra channels",
        icon: "stream",
        titleClassName: "text-pink-200 drop-shadow-[0_0_14px_rgba(244,114,182,0.38)]",
        sectionClassName:
          "border-pink-300/14 bg-[linear-gradient(180deg,rgba(244,114,182,0.08),rgba(255,255,255,0.025))]",
        items: ["📺 Записи всех стримов: косплей, игры", "🧨 Огонек в TikTok"]
      },
      {
        title: "Ежемесячные лимиты",
        label: "monthly drops",
        icon: "gift",
        titleClassName: "text-violet-200 drop-shadow-[0_0_14px_rgba(192,132,252,0.38)]",
        sectionClassName:
          "border-violet-300/14 bg-[linear-gradient(180deg,rgba(167,139,250,0.08),rgba(255,255,255,0.025))]",
        items: [
          "✨ Бонусный контент (личные фото / фотооткрытки) — 3 шт",
          "✨ Сигна — 3 шт",
          "💡 Эксклюзивные обои для телефона — 3 шт",
          "💡 Арты от ИИ по пожеланию — 3 шт",
          "💡 Контент на выбор — 1 раз в месяц"
        ]
      },
      {
        title: "Статус",
        label: "club identity",
        icon: "status",
        titleClassName: "text-fuchsia-100 drop-shadow-[0_0_14px_rgba(244,114,182,0.36)]",
        items: [
          "🩸 Титул в общем чате [Insider]"
        ]
      }
    ]
  },
  {
    id: "vip",
    badge: "tier 03",
    label: 'Тариф "VIP"',
    level: "Уровень доступа: абсолютный",
    price: "50 EUR",
    teaser: "Премиальный уровень поддержки, который читается как лучший выбор для большинства.",
    symbol: "crown",
    statusBadge: "RECOMMENDED",
    noteBadge: "MOST POPULAR",
    accentClass:
      "border-amber-300/34 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.26),transparent_28%),radial-gradient(circle_at_right,rgba(249,115,22,0.18),transparent_28%),linear-gradient(180deg,rgba(36,20,10,0.98),rgba(20,10,7,1))]",
    glowClass: "shadow-[0_0_36px_rgba(251,191,36,0.34),0_16px_65px_rgba(249,115,22,0.20)]",
    sectionTitleClass: "text-amber-100 drop-shadow-[0_0_16px_rgba(251,191,36,0.34)]",
    sectionCardClass:
      "border-amber-300/16 bg-[linear-gradient(180deg,rgba(251,191,36,0.09),rgba(255,255,255,0.03))]",
    headerBadgeClass: "border-amber-300/14 bg-black/20 text-amber-100/70",
    statusBadgeClass:
      "border border-amber-300/30 bg-amber-300/12 text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.16)]",
    sections: [
      {
        title: "Основные привилегии",
        label: "premium access",
        icon: "crown",
        titleClassName: "text-amber-100 drop-shadow-[0_0_16px_rgba(251,191,36,0.34)]",
        items: ['Включает всё из тарифа "Приближённый" и "Спутник".']
      },
      {
        title: "Эксклюзивный доступ",
        label: "gold access",
        icon: "stream",
        titleClassName: "text-orange-100 drop-shadow-[0_0_16px_rgba(251,146,60,0.30)]",
        sectionClassName:
          "border-orange-300/16 bg-[linear-gradient(180deg,rgba(251,146,60,0.09),rgba(255,255,255,0.03))]",
        items: [
          "🎮 Ранние записи прохождений — эксклюзивный доступ",
          "🎬 Мини-сериалы и сюжетные проекты",
          "🎭 Эксклюзивные скетчи",
          "📖 Дополнительные сюжетные материалы",
          "💬 Голосовые сообщения в Telegram",
          "🎮 Совместные игры, если совпадает свободное время",
          "🎥 Персональные видеопоздравления и пожелания",
          "🎂 Именные поздравления на стримах"
        ]
      },
      {
        title: "Влияние на проект",
        label: "priority vote",
        icon: "vote",
        titleClassName: "text-yellow-100 drop-shadow-[0_0_16px_rgba(253,224,71,0.28)]",
        sectionClassName:
          "border-yellow-300/16 bg-[linear-gradient(180deg,rgba(253,224,71,0.08),rgba(255,255,255,0.02))]",
        items: [
          "🗳 Приоритетное участие в голосованиях",
          "💡 Контент на выбор — 3 раза в месяц",
          "💡 Возможность предлагать идеи для будущих проектов",
          "💡 Возможность влиять на развитие некоторых сюжетов"
        ]
      },
      {
        title: "Ежемесячные лимиты",
        label: "monthly prestige",
        icon: "gift",
        titleClassName: "text-amber-50 drop-shadow-[0_0_16px_rgba(251,191,36,0.30)]",
        items: [
          "✨ Бонусный контент (личные фото / фотооткрытки) — 5 шт",
          "✨ Сигны — 5 шт",
          "📱 Эксклюзивные обои — 5 шт",
          "🎨 Арты ИИ по пожеланию — 5 шт"
        ]
      },
      {
        title: "Статус",
        label: "highest signal",
        icon: "status",
        titleClassName: "text-orange-50 drop-shadow-[0_0_18px_rgba(249,115,22,0.28)]",
        items: [
          "🩸 Материалы, которые не появятся на других уровнях",
          "🩸 Закрытые обсуждения будущих проектов",
          "🩸 Контент без повторов и адаптаций",
          "🩸 Приоритет среди подписчиков",
          "🩸 Особый титул в общем чате [VIP] + уровень"
        ]
      }
    ]
  },
  {
    id: "after-dark",
    badge: "tier 04",
    label: "AFTER DARK",
    level: "Уровень доступа: максимальный",
    price: "80 EUR",
    teaser: "Самая смелая сторона Люмины. Самый тёмный и самый закрытый уровень доступа.",
    symbol: "moon",
    statusBadge: "UNLOCK THE DARK SIDE",
    noteBadge: "EXCLUSIVE ACCESS",
    accentClass:
      "border-violet-400/34 bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.22),transparent_20%),radial-gradient(circle_at_20%_90%,rgba(91,33,182,0.20),transparent_28%),radial-gradient(circle_at_85%_22%,rgba(217,70,239,0.14),transparent_18%),linear-gradient(180deg,rgba(4,4,7,0.99),rgba(2,2,4,1))]",
    glowClass: "shadow-[0_0_48px_rgba(139,92,246,0.28),0_0_84px_rgba(76,29,149,0.24),0_20px_80px_rgba(0,0,0,0.7)]",
    sectionTitleClass: "text-violet-100 drop-shadow-[0_0_18px_rgba(167,139,250,0.38)]",
    sectionCardClass:
      "border-violet-400/16 bg-[linear-gradient(180deg,rgba(139,92,246,0.09),rgba(0,0,0,0.26))]",
    headerBadgeClass: "border-violet-300/18 bg-black/30 text-violet-100/72",
    statusBadgeClass:
      "border border-violet-300/26 bg-violet-400/12 text-violet-100 shadow-[0_0_22px_rgba(139,92,246,0.18)]",
    afterDarkAtmosphere: true,
    sections: [
      {
        title: "Пилон",
        label: "restricted archive",
        icon: "moon",
        titleClassName: "text-violet-100 drop-shadow-[0_0_18px_rgba(167,139,250,0.38)]",
        sectionClassName:
          "border-violet-300/16 bg-[linear-gradient(180deg,rgba(167,139,250,0.08),rgba(0,0,0,0.30))]",
        items: [
          "🌙 Все материалы предыдущих уровней",
          "🌙 Все материалы по пилону",
          "🌙 Фото и видео тренировок",
          "🌙 Танцевальные связки и постановки",
          "🌙 Закулисье занятий",
          "🌙 Подготовка к тренировкам",
          "🌙 Прогресс обучения от первого занятия",
          "🌙 Неудачные дубли и забавные моменты",
          "🌙 Эксклюзивные эдиты"
        ]
      },
      {
        title: "Более смелый контент",
        label: "uncut archive",
        icon: "flame",
        titleClassName: "text-fuchsia-100 drop-shadow-[0_0_18px_rgba(217,70,239,0.34)]",
        sectionClassName:
          "border-fuchsia-300/16 bg-[linear-gradient(180deg,rgba(217,70,239,0.08),rgba(0,0,0,0.30))]",
        items: [
          "🔥 Более смелые фотосеты",
          "🔥 Более смелые образы",
          "🔥 Дополнительные материалы со съёмок",
          "🔥 Эксклюзивные backstage-видео",
          "🔥 Контент, который не публикуется в других тарифах"
        ]
      },
      {
        title: "Дневник развития",
        label: "private process",
        icon: "diamond",
        titleClassName: "text-slate-100 drop-shadow-[0_0_18px_rgba(148,163,184,0.24)]",
        sectionClassName:
          "border-slate-300/14 bg-[linear-gradient(180deg,rgba(148,163,184,0.08),rgba(0,0,0,0.26))]",
        items: [
          "💎 Личный путь освоения пилона",
          "💎 Цели, достижения и результаты",
          "💎 Подготовка номеров",
          "💎 Отработка элементов",
          "💎 Всё, что остаётся за кадром основной аудитории"
        ]
      },
      {
        title: "Статус",
        label: "night rank",
        icon: "status",
        titleClassName: "text-violet-50 drop-shadow-[0_0_20px_rgba(139,92,246,0.30)]",
        sectionClassName:
          "border-violet-400/18 bg-[linear-gradient(180deg,rgba(109,40,217,0.10),rgba(0,0,0,0.28))]",
        items: [
          "🌙 Особый статус в сообществе [Dark VIP] + уровень",
          "🌙 Максимальный приоритет среди всех уровней подписки",
          "🌙 Самые ранние анонсы новых проектов",
          "🌙 Доступ ко всем будущим экспериментальным форматам",
          "🔥 Косплей + пилон"
        ]
      }
    ]
  }
];

export default async function TelegramTiersPage() {
  const profile = await requireAnyProfile();

  return (
    <MiniAppShell profile={profile} title="Уровни">
      <TierAccordionList cards={tierCards} />
    </MiniAppShell>
  );
}
