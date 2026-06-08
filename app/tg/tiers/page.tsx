export const dynamic = "force-dynamic";

import { TierAccordionList, type TierAccordionCard } from "@/components/tiers/tier-accordion-list";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { hasClubAccess } from "@/lib/auth/access";
import { requireAnyProfile } from "@/lib/auth/guards";

const tierCards: TierAccordionCard[] = [
  {
    id: "tier-1",
    tier: "tier_1",
    badge: "tier 01",
    label: 'Тариф "Спутник"',
    level: "Уровень доступа: базовый",
    price: "10 EUR / месяц",
    teaser: "Вход в закрытый мир, ранний доступ и первые эксклюзивы.",
    symbol: "star",
    noteBadge: "FIRST STEP",
    accentClass:
      "border-slate-200/18 bg-[radial-gradient(circle_at_top,rgba(226,232,240,0.18),transparent_30%),radial-gradient(circle_at_bottom,rgba(125,211,252,0.12),transparent_36%),linear-gradient(180deg,rgba(22,22,31,0.96),rgba(11,13,20,0.98))]",
    glowClass: "shadow-[0_0_26px_rgba(203,213,225,0.18),0_16px_55px_rgba(56,189,248,0.10)]",
    sectionTitleClass: "text-slate-100",
    sectionCardClass: "border-slate-200/10 bg-[linear-gradient(180deg,rgba(226,232,240,0.06),rgba(15,23,42,0.16))]",
    headerBadgeClass: "border-slate-200/10 bg-black/20 text-slate-200/60",
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
  {
    id: "tier-2",
    tier: "tier_2",
    badge: "tier 02",
    label: "Тариф Insider",
    level: "Уровень доступа: расширенный",
    price: "25 EUR / месяц",
    teaser: "Больше процесса, больше backstage и ближе контакт с тем, что создаётся.",
    symbol: "spark",
    noteBadge: "INNER CIRCLE",
    accentClass:
      "border-fuchsia-300/22 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.16),transparent_30%),linear-gradient(180deg,rgba(28,12,34,0.97),rgba(13,10,24,0.98))]",
    glowClass: "shadow-[0_0_28px_rgba(217,70,239,0.22),0_16px_58px_rgba(236,72,153,0.10)]",
    sectionTitleClass: "text-fuchsia-200",
    sectionCardClass: "border-fuchsia-300/14 bg-[linear-gradient(180deg,rgba(217,70,239,0.08),rgba(255,255,255,0.03))]",
    headerBadgeClass: "border-fuchsia-300/12 bg-black/20 text-fuchsia-100/65",
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
          "Бонусный контент и сигны",
          "Обои для телефона",
          "ИИ-арты по пожеланию",
          "Один контент-запрос в месяц"
        ]
      }
    ]
  },
  {
    id: "tier-3",
    tier: "tier_3",
    badge: "tier 03",
    label: 'Тариф "VIP"',
    level: "Уровень доступа: максимальный",
    price: "50 EUR / месяц",
    teaser: "Премиальный уровень для тех, кто хочет максимум внимания и максимум материалов.",
    symbol: "crown",
    statusBadge: "RECOMMENDED",
    noteBadge: "MOST POPULAR",
    accentClass:
      "border-amber-300/34 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.26),transparent_28%),radial-gradient(circle_at_right,rgba(249,115,22,0.18),transparent_28%),linear-gradient(180deg,rgba(36,20,10,0.98),rgba(20,10,7,1))]",
    glowClass: "shadow-[0_0_36px_rgba(251,191,36,0.34),0_16px_65px_rgba(249,115,22,0.20)]",
    sectionTitleClass: "text-amber-100",
    sectionCardClass: "border-amber-300/16 bg-[linear-gradient(180deg,rgba(251,191,36,0.09),rgba(255,255,255,0.03))]",
    headerBadgeClass: "border-amber-300/14 bg-black/20 text-amber-100/70",
    statusBadgeClass: "border border-amber-300/30 bg-amber-300/12 text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.16)]",
    sections: [
      {
        title: "Что входит",
        label: "premium access",
        icon: "crown",
        items: [
          "Всё из предыдущих уровней",
          "Эксклюзивные мини-сериалы и скетчи",
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
  {
    id: "tier-4",
    tier: "tier_4",
    badge: "tier 04",
    label: "After Dark",
    level: "Уровень доступа: самый закрытый",
    price: "80 EUR / месяц",
    teaser: "Самая смелая сторона Люмины. Самый тёмный и самый закрытый уровень доступа.",
    symbol: "moon",
    statusBadge: "UNLOCK THE DARK SIDE",
    noteBadge: "EXCLUSIVE ACCESS",
    accentClass:
      "border-violet-400/34 bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.22),transparent_20%),radial-gradient(circle_at_20%_90%,rgba(91,33,182,0.20),transparent_28%),radial-gradient(circle_at_85%_22%,rgba(217,70,239,0.14),transparent_18%),linear-gradient(180deg,rgba(4,4,7,0.99),rgba(2,2,4,1))]",
    glowClass: "shadow-[0_0_48px_rgba(139,92,246,0.28),0_0_84px_rgba(76,29,149,0.24),0_20px_80px_rgba(0,0,0,0.7)]",
    sectionTitleClass: "text-violet-100",
    sectionCardClass: "border-violet-400/16 bg-[linear-gradient(180deg,rgba(139,92,246,0.09),rgba(0,0,0,0.26))]",
    headerBadgeClass: "border-violet-300/18 bg-black/30 text-violet-100/72",
    statusBadgeClass: "border border-violet-300/26 bg-violet-400/12 text-violet-100 shadow-[0_0_22px_rgba(139,92,246,0.18)]",
    afterDarkAtmosphere: true,
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
];

export default async function TelegramTiersPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireAnyProfile();
  const accessOpen = hasClubAccess(profile);
  const params = (await searchParams) ?? {};
  const sent = (Array.isArray(params.sent) ? params.sent[0] : params.sent) === "1";
  const error = (Array.isArray(params.error) ? params.error[0] : params.error) === "1";

  return (
    <MiniAppShell profile={profile} title="Закрытый клуб">
      {!accessOpen ? (
        <section className="rounded-[28px] border border-white/12 bg-white/[0.04] px-5 py-5 text-white shadow-[0_18px_46px_rgba(0,0,0,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">Welcome</p>
          <h2 className="mt-2 font-display text-[1.6rem] leading-none text-white sm:text-[2rem]">
            Добро пожаловать в закрытый клуб
          </h2>
          <p className="mt-3 max-w-[34rem] text-sm leading-6 text-white/72 sm:text-[0.96rem]">
            Выбери уровень доступа ниже. После подтверждения здесь откроется лента, профиль и весь закрытый контент клуба.
          </p>
        </section>
      ) : null}

      {sent ? (
        <section className="rounded-[28px] border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100 shadow-glow">
          Заявка отправлена. После подтверждения доступ откроется здесь же.
        </section>
      ) : null}

      {error ? (
        <section className="rounded-[28px] border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100 shadow-glow">
          Не удалось отправить заявку. Попробуй ещё раз.
        </section>
      ) : null}

      <TierAccordionList cards={tierCards} />
    </MiniAppShell>
  );
}
