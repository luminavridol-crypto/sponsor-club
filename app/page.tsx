import Link from "next/link";
import { createPurchaseRequestAction } from "@/app/actions";
import { BrandShell } from "@/components/layout/brand-shell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const steps = [
  {
    number: "01",
    title: "Выбираешь уровень доступа",
    text: "Смотри, какой tier подходит по глубине доступа и формату контента."
  },
  {
    number: "02",
    title: "Получаешь доступ по приглашению",
    text: "После активации попадаешь внутрь закрытого клуба без лишних шагов."
  },
  {
    number: "03",
    title: "Открываешь закрытый контент",
    text: "Смотри посты, фото, видео и редкие материалы, которых нет в открытых соцсетях."
  }
];

const tierCards = [
  {
    tier: "Tier 1",
    name: "Наблюдатель",
    image: "/tiers/tier-1.jpg",
    glow: "border-accent/25 shadow-glow",
    lockTone: "border-accent/35 bg-accent/12 text-accentSoft",
    points: [
      "Первый уровень закрытого клуба",
      "Материалы с ограниченным доступом",
      "Более камерная атмосфера",
      "Мягкое знакомство с внутренним пространством"
    ]
  },
  {
    tier: "Tier 2",
    name: "Приближённый",
    image: "/tiers/tier-2.jpg",
    glow: "border-accent/35 shadow-glow",
    lockTone: "border-accent/40 bg-accent/14 text-accentSoft",
    points: [
      "Более глубокий уровень клуба",
      "Расширенный доступ к внутренним материалам",
      "Больше закрытого пространства",
      "Формат для тех, кто хочет быть ближе",
      "Дополнительные клубные возможности"
    ]
  },
  {
    tier: "Tier 3",
    name: "VIP",
    image: "/tiers/tier-3.jpg",
    glow: "border-cyanGlow/30 shadow-cyan",
    lockTone: "border-cyanGlow/35 bg-cyanGlow/12 text-cyanGlow",
    points: [
      "Самый высокий уровень доступа",
      "Особый статус внутри клуба",
      "Максимальная глубина закрытого пространства",
      "Отдельные клубные возможности",
      "Формат для самых близких участников"
    ]
  }
];

const insideItems = [
  {
    title: "Эксклюзивные фотосеты",
    text: "Редкие кадры, которые не попадают в открытый доступ.",
    number: "01",
    icon: <PhotoIcon />
  },
  {
    title: "Закрытые видео",
    text: "Видео, которые остаются только внутри клуба.",
    number: "02",
    icon: <PlayIcon />
  },
  {
    title: "Бэкстейдж и личные моменты",
    text: "То, что происходит за кадром. Никакой постановки.",
    number: "03",
    icon: <LockMiniIcon />
  },
  {
    title: "Ранний доступ",
    text: "Ты видишь всё раньше остальных.",
    number: "04",
    icon: <ClockIcon />
  }
];

const reasons = [
  {
    title: "То, что не публикуется открыто",
    text: "Уникальный контент, которого нет ни в одной из моих соцсетей.",
    icon: <LockMiniIcon />
  },
  {
    title: "Более близкий контакт со мной",
    text: "Личное общение, особая атмосфера и внимание к участникам клуба.",
    icon: <HeartIcon />
  },
  {
    title: "Ранний доступ ко всем проектам",
    text: "Новости, проекты, анонсы и материалы — всё раньше остальных.",
    icon: <StarIcon />
  },
  {
    title: "Ты становишься частью истории",
    text: "Поддержка моего творчества и возможность наблюдать, как создаётся настоящее.",
    icon: <DiamondMiniIcon />
  }
];

const socials = [
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@lumina5927",
    icon: <TikTokIcon />
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/luminaflare1342e/",
    icon: <InstagramIcon />
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@lu_lu_f",
    icon: <YouTubeIcon />
  },
  {
    name: "Telegram",
    href: "https://t.me/lu_lu_f",
    icon: <TelegramIcon />
  },
  {
    name: "Twitch",
    href: "https://www.twitch.tv/luminaf",
    icon: <TwitchIcon />
  }
];

const tierHighlights = [
  {
    title: "Эксклюзивный контент",
    text: "То, чего нет в открытых соцсетях",
    icon: <CrownIcon />
  },
  {
    title: "Ранний доступ",
    text: "Смотри раньше других",
    icon: <StarIcon />
  },
  {
    title: "Ближе к процессу",
    text: "Будь частью создания контента",
    icon: <HeartIcon />
  },
  {
    title: "Особый уровень",
    text: "Уникальные материалы только для своих",
    icon: <DiamondMiniIcon />
  }
];

export default async function HomePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const params = (await searchParams) ?? {};
  const inviteRequestSent =
    (Array.isArray(params.inviteRequestSent)
      ? params.inviteRequestSent[0]
      : params.inviteRequestSent) === "1";
  const inviteRequestError =
    (Array.isArray(params.inviteRequestError)
      ? params.inviteRequestError[0]
      : params.inviteRequestError) === "1";

  const profileHref = user ? "/dashboard" : "/login";
  const accessHref = user ? "/dashboard" : "/invite";
  const accessLabel = user ? "Перейти в кабинет" : "Получить доступ";

  return (
    <BrandShell
      rightSlot={
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Link
            href={profileHref}
            className="w-full rounded-2xl border border-white/10 px-4 py-2 text-center text-sm text-white/80 transition hover:border-accent/40 hover:text-white sm:w-auto"
          >
            {user ? "Кабинет" : "Вход"}
          </Link>
          <Link
            href="/invite"
            className="w-full rounded-2xl bg-white px-4 py-2 text-center text-sm font-medium text-background transition hover:bg-goldSoft sm:w-auto"
          >
            Войти по invite
          </Link>
        </div>
      }
    >
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[4%] top-[18%] h-72 w-72 rounded-full bg-cyanGlow/8 blur-[110px]" />
          <div className="absolute right-[6%] top-[6%] h-80 w-80 rounded-full bg-accent/12 blur-[120px]" />
          <div className="absolute bottom-[12%] left-[8%] h-60 w-60 rounded-full bg-accent/10 blur-[110px]" />
          <div className="absolute bottom-0 right-[10%] h-72 w-72 rounded-full bg-cyanGlow/6 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-[96rem] px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
          <div className="relative overflow-hidden rounded-[2.2rem] border border-accent/18 bg-[#060711]/92 px-6 py-12 shadow-glow sm:px-10 sm:py-16 lg:px-16 lg:py-20">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,79,216,0.13),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,79,216,0.08),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
            <div className="pointer-events-none absolute -right-12 top-14 h-80 w-80 rounded-full border border-accent/15" />
            <div className="pointer-events-none absolute -left-24 bottom-[-7rem] h-64 w-64 rounded-full border border-accent/10" />

            <div className="relative mx-auto max-w-5xl text-center">
              <div className="inline-flex max-w-full items-center gap-3 rounded-full border border-accent/45 bg-accent/8 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-accentSoft sm:px-7 sm:text-sm sm:tracking-[0.42em]">
                <LockBadgeIcon />
                <span className="truncate">Private sponsor-only</span>
              </div>

              <h1
                className="mt-8 text-[2.15rem] leading-[1.04] tracking-[-0.03em] text-white sm:mt-10 sm:text-[3.3rem] lg:text-[5rem]"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                Закрытый клуб
                <br />
                с{" "}
                <span className="bg-gradient-to-r from-accentSoft via-accent to-white bg-clip-text text-transparent">
                  эксклюзивным контентом
                </span>
              </h1>

              <p className="mt-6 text-[11px] uppercase tracking-[0.22em] text-white/50 sm:mt-7 sm:text-base sm:tracking-[0.42em]">
                недоступным в открытых соцсетях
              </p>

              <div className="mx-auto mt-10 flex max-w-4xl items-center">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/30 to-accent/10" />
                <div className="mx-3 h-[3px] w-14 rounded-full bg-accent shadow-[0_0_20px_rgba(255,79,216,0.95)]" />
                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-accent/30 to-accent/10" />
              </div>

              <div className="mx-auto mt-8 max-w-3xl space-y-2 text-base leading-8 text-white/68 sm:mt-10 sm:text-[2rem] sm:leading-[1.5]">
                <p>Доступ по приглашению.</p>
                <p>Редкие фото, видео и личные материалы.</p>
              </div>

              <div className="mt-10 flex flex-col items-stretch justify-center gap-4 sm:mt-12 sm:items-center sm:flex-row">
                <Link
                  href={accessHref}
                  className="inline-flex w-full items-center justify-center gap-4 rounded-[1.35rem] border border-white/12 bg-white/[0.04] px-5 py-4 text-lg font-medium text-white/92 transition hover:border-white/20 hover:bg-white/[0.07] sm:min-w-[18rem] sm:px-7 sm:py-5 sm:text-xl"
                >
                  <LockButtonIcon />
                  <span>{accessLabel}</span>
                </Link>

                <Link
                  href="#tiers"
                  className="inline-flex w-full items-center justify-center gap-4 rounded-[1.35rem] border border-accent/45 bg-gradient-to-r from-accent/80 via-[#c458f6] to-[#6f3ff4] px-5 py-4 text-lg font-medium text-white shadow-[0_10px_40px_rgba(255,79,216,0.28)] transition hover:scale-[1.01] hover:brightness-110 sm:min-w-[19rem] sm:px-7 sm:py-5 sm:text-xl"
                >
                  <DiamondButtonIcon />
                  <span>Уровни доступа</span>
                </Link>
              </div>

              <div className="mx-auto mt-10 max-w-4xl">
                <p className="text-xs uppercase tracking-[0.32em] text-white/38">
                  Мои соцсети
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-center">
                  {socials.map((social) => (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex min-w-0 items-center gap-3 rounded-[1.15rem] border border-accent/20 bg-white/[0.03] px-3 py-3 text-white/82 transition hover:border-accent/45 hover:bg-white/[0.05] sm:rounded-[1.35rem] sm:px-4"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accentSoft shadow-[0_0_22px_rgba(255,79,216,0.15)] sm:h-11 sm:w-11">
                        {social.icon}
                      </span>
                      <span className="truncate text-sm sm:text-base">{social.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="glass-card rounded-[30px] p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">
                Как это работает
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                Простой путь внутрь клуба
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-white/58">
              Никакой сложной схемы. Всё понятно с первого взгляда: выбираешь формат,
              получаешь доступ и открываешь закрытый контент.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5"
              >
                <p className="text-sm uppercase tracking-[0.24em] text-white/35">
                  {step.number}
                </p>
                <h3 className="mt-4 text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/60">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tiers" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">
              Уровни доступа
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-5xl">
              Выбери <span className="text-accentSoft">глубину</span> доступа
            </h2>
            <p className="mt-5 text-base leading-8 text-white/58 sm:text-lg sm:leading-9">
              Каждый уровень открывает больше редкого контента.
              <br />
              Доступ выдаётся вручную и только после личного подтверждения.
            </p>
          </div>

          <div className="flex items-start gap-4 rounded-[26px] border border-white/10 bg-white/[0.03] px-5 py-5 text-white/72 lg:max-w-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accentSoft">
              <LockBadgeIcon />
            </div>
            <div>
              <p className="text-lg font-medium text-accentSoft">
                Только для участников клуба
              </p>
              <p className="mt-1 text-base leading-7 text-white/48">
                Контент скрыт до получения доступа
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {tierCards.map((tier) => (
            <div
              key={tier.tier}
              className={`relative overflow-hidden rounded-[30px] border bg-[#0a0b14] ${tier.glow}`}
            >
              <div
                className="relative h-[260px] overflow-hidden border-b border-white/10 bg-cover bg-center sm:h-[320px]"
                style={{ backgroundImage: `url('${tier.image}')` }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#0a0b14]" />
                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-6">
                  <p className="text-sm uppercase tracking-[0.32em] text-white/82">
                    {tier.tier}
                  </p>
                </div>
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full border backdrop-blur-md ${tier.lockTone}`}
                  >
                    <LockBadgeIcon />
                  </div>
                </div>
              </div>

              <div className="px-5 pb-6 pt-5 sm:px-7 sm:pb-7">
                <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <h3 className="text-[1.7rem] font-semibold leading-tight text-white sm:text-[2rem]">
                    {tier.name}
                  </h3>
                  <p
                    className={`text-sm uppercase tracking-[0.24em] ${
                      tier.tier === "Tier 3" ? "text-cyanGlow" : "text-accentSoft"
                    }`}
                  >
                    закрытый уровень
                  </p>
                </div>

                <div className="mt-5 space-y-4">
                  {tier.points.map((point, index) => (
                    <div key={point} className="flex items-start gap-3 text-base text-white/84 sm:text-lg">
                      <span
                        className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                          tier.tier === "Tier 3"
                            ? "border-cyanGlow/35 text-cyanGlow"
                            : "border-accent/35 text-accentSoft"
                        }`}
                      >
                        {tier.tier === "Tier 1" ? (
                          index === 0 ? (
                            <ClockIcon />
                          ) : index === 1 ? (
                            <LockMiniIcon />
                          ) : index === 2 ? (
                            <CameraIcon />
                          ) : (
                            <StoryIcon />
                          )
                        ) : tier.tier === "Tier 2" ? (
                          index === 0 ? (
                            <ClockIcon />
                          ) : index === 1 ? (
                            <PhotoIcon />
                          ) : index === 2 ? (
                            <LockMiniIcon />
                          ) : index === 3 ? (
                            <StarIcon />
                          ) : (
                            <ChatIcon />
                          )
                        ) : index === 0 ? (
                          <CrownIcon />
                        ) : index === 1 ? (
                          <DiamondMiniIcon />
                        ) : index === 2 ? (
                          <InfinityIcon />
                        ) : index === 3 ? (
                          <HeartIcon />
                        ) : (
                          <PhoneIcon />
                        )}
                      </span>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-center gap-2 text-base text-white/38">
                  <LockMiniIcon />
                  <span>И многое, что не публикуется открыто</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[30px] border border-white/10 bg-white/[0.03] px-6 py-6">
          <div className="grid gap-6 lg:grid-cols-4">
            {tierHighlights.map((item, index) => (
              <div
                key={item.title}
                className={`flex items-start gap-4 ${
                  index < tierHighlights.length - 1 ? "lg:border-r lg:border-white/10 lg:pr-6" : ""
                }`}
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accentSoft">
                  {item.icon}
                </div>
                <div>
                  <p className="text-lg font-medium text-accentSoft">{item.title}</p>
                  <p className="mt-1 text-lg leading-8 text-white/55">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-[30px] border border-accent/20 bg-[linear-gradient(180deg,rgba(255,79,216,0.06),rgba(255,255,255,0.02))] px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">
                Закрытый вход
              </p>
              <h3
                className="mt-3 text-[1.9rem] leading-[1.08] text-white sm:text-[2.6rem]"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                Хочешь попасть внутрь?
              </h3>
              <p className="mt-4 text-base leading-7 text-white/62 sm:text-lg sm:leading-8">
                Оставь короткий запрос, и я сама свяжусь с тобой удобным способом.
              </p>
            </div>

            <Link
              href="#invitation-request"
              className="inline-flex items-center justify-center rounded-[1.15rem] border border-accent/45 bg-gradient-to-r from-accent/85 to-[#c457f5] px-6 py-4 text-lg font-medium text-white transition hover:brightness-110"
            >
              Получить приглашение
            </Link>
          </div>
        </div>

        <div
          id="invitation-request"
          className="mt-8 rounded-[30px] border border-white/10 bg-white/[0.03] px-6 py-6 sm:px-8"
        >
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">
                Запрос на приглашение
              </p>
              <h3
                className="mt-4 text-[1.9rem] leading-[1.08] text-white sm:text-[2.6rem]"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                Расскажи, как
                <br />
                с тобой связаться
              </h3>
              <p className="mt-4 max-w-xl text-lg leading-8 text-white/62">
                Эти данные попадут только в мой рабочий кабинет. После этого я смогу
                написать тебе лично и обсудить детали доступа.
              </p>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-black/20 p-5 sm:p-6">
              {inviteRequestSent ? (
                <div className="mb-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                  Запрос отправлен. Я увижу его в админке и свяжусь с тобой по указанным данным.
                </div>
              ) : null}
              {inviteRequestError ? (
                <div className="mb-5 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                  Не получилось отправить запрос. Проверь поля и попробуй ещё раз.
                </div>
              ) : null}

              <form action={createPurchaseRequestAction} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm text-white/68">Имя</span>
                  <input
                    type="text"
                    name="displayName"
                    required
                    placeholder="Как к тебе обращаться"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-accent/45"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-white/68">Email</span>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-accent/45"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-white/68">Страна</span>
                  <input
                    type="text"
                    name="country"
                    required
                    placeholder="Например: Украина, Германия, Польша"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-accent/45"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-[0.82fr_1.18fr]">
                  <label className="block">
                    <span className="mb-2 block text-sm text-white/68">Удобная связь</span>
                    <select
                      name="contactMethod"
                      defaultValue="Telegram"
                      required
                      className="w-full rounded-2xl border border-white/10 bg-[#11121b] px-4 py-3 text-white outline-none transition focus:border-accent/45"
                    >
                      <option value="Telegram">Telegram</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Email">Email</option>
                      <option value="Other">Другая связь</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm text-white/68">Ник или ссылка</span>
                    <input
                      type="text"
                      name="contactHandle"
                      required
                      placeholder="@username или ссылка, где тебе ответить"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-accent/45"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm text-white/68">Интересующий уровень</span>
                  <select
                    name="tier"
                    defaultValue="tier_1"
                    className="w-full rounded-2xl border border-white/10 bg-[#11121b] px-4 py-3 text-white outline-none transition focus:border-accent/45"
                  >
                    <option value="tier_1">Наблюдатель</option>
                    <option value="tier_2">Приближённый</option>
                    <option value="tier_3">VIP</option>
                  </select>
                </label>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-[1.15rem] border border-accent/45 bg-gradient-to-r from-accent/85 to-[#c457f5] px-5 py-4 text-lg font-medium text-white transition hover:brightness-110"
                >
                  Отправить запрос
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="glass-card rounded-[30px] border-accent/20 p-6 sm:p-8">
            <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">
              Что внутри
            </p>
            <h2
              className="mt-4 max-w-3xl text-[2rem] leading-[1.08] text-white sm:text-[3.25rem]"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Не просто посты,
              <br />а <span className="text-accentSoft">закрытая атмосфера</span>
            </h2>

            <div className="mt-8 space-y-4">
              {insideItems.map((item) => (
                <div
                  key={item.number}
                  className="flex flex-col items-start gap-4 rounded-[26px] border border-accent/30 bg-[linear-gradient(180deg,rgba(255,79,216,0.04),rgba(255,255,255,0.01))] px-4 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-5 sm:py-5"
                >
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-accent/45 bg-accent/10 text-accentSoft shadow-[0_0_30px_rgba(255,79,216,0.16)] sm:h-28 sm:w-28">
                    <span className="scale-125">{item.icon}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3
                      className="text-[1.5rem] leading-tight text-white sm:text-[2rem]"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {item.title}
                    </h3>
                    <p className="mt-3 max-w-xl text-base leading-7 text-white/58 sm:text-lg sm:leading-9">
                      {item.text}
                    </p>
                  </div>

                  <div className="shrink-0 text-[2.7rem] leading-none text-accent/20 sm:pl-2 sm:text-[4.8rem]">
                    {item.number}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-[30px] border-accent/20 p-6 sm:p-8">
            <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">
              Почему это интересно
            </p>
            <h2
              className="mt-4 max-w-2xl text-[2rem] leading-[1.08] text-white sm:text-[3.1rem]"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Ценность, которая
              <br />
              остаётся <span className="text-accentSoft">внутри клуба</span>
            </h2>

            <div className="mt-8">
              {reasons.map((reason, index) => (
                <div
                  key={reason.title}
                  className={`flex flex-col gap-4 py-5 sm:flex-row sm:gap-6 sm:py-6 ${
                    index < reasons.length - 1 ? "border-b border-white/10" : ""
                  }`}
                >
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-accent/45 bg-accent/10 text-accentSoft shadow-[0_0_30px_rgba(255,79,216,0.14)] sm:h-28 sm:w-28">
                    <span className="scale-[1.35]">{reason.icon}</span>
                  </div>

                  <div className="relative min-w-0 flex-1 border-t border-white/10 pt-4 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
                    <div className="absolute left-1 top-[-5px] h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_16px_rgba(255,79,216,0.95)] sm:left-[-5px] sm:top-1/2 sm:-translate-y-1/2" />
                    <h3
                      className="max-w-xl text-[1.45rem] leading-tight text-white sm:text-[1.9rem]"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {reason.title}
                    </h3>
                    <p className="mt-3 max-w-xl text-base leading-7 text-white/58 sm:text-lg sm:leading-9">
                      {reason.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
        <div className="glass-card relative overflow-hidden rounded-[34px] p-8 shadow-glow sm:p-10">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-accent/10 to-transparent" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">
                Final CTA
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white sm:text-4xl">
                Если тебе нравится мой контент — ты точно захочешь увидеть больше
              </h2>
              <p className="mt-4 text-base leading-7 text-white/65">
                Закрытый клуб создан для тех, кто хочет быть ближе, видеть больше и
                получать самое ценное раньше остальных.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={accessHref}
                className="rounded-2xl bg-white px-5 py-3 text-center font-medium text-background transition hover:bg-goldSoft"
              >
                Войти в закрытый клуб
              </Link>
              <Link
                href="#tiers"
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-center font-medium text-white/82 transition hover:border-accent/30 hover:text-white"
              >
                Посмотреть уровни
              </Link>
            </div>
          </div>
        </div>
      </section>
    </BrandShell>
  );
}

function LockBadgeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.5 10V8.4A4.5 4.5 0 0 1 12 4a4.5 4.5 0 0 1 4.5 4.4V10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6.4 10h11.2c.9 0 1.6.7 1.6 1.6v6.8c0 .9-.7 1.6-1.6 1.6H6.4c-.9 0-1.6-.7-1.6-1.6v-6.8c0-.9.7-1.6 1.6-1.6Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="14.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

function LockButtonIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.5 10V8.4A4.5 4.5 0 0 1 12 4a4.5 4.5 0 0 1 4.5 4.4V10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6.4 10h11.2c.9 0 1.6.7 1.6 1.6v6.8c0 .9-.7 1.6-1.6 1.6H6.4c-.9 0-1.6-.7-1.6-1.6v-6.8c0-.9.7-1.6 1.6-1.6Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="14.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

function DiamondButtonIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m7 8 2.4-3h5.2L17 8l-5 9-5-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M4 8h16M9.4 5 12 8l2.6-3M12 8v9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 17 1.5-8 5.5 4 5.5-4L19 17H5ZM7 19h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m12 4 2.3 4.7 5.2.8-3.8 3.7.9 5.2L12 15.9 7.4 18.4l.9-5.2-3.8-3.7 5.2-.8L12 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DiamondMiniIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m7 8 2.4-3h5.2L17 8l-5 9-5-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M4 8h16M9.4 5 12 8l2.6-3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5v5l3.2 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LockMiniIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8.5 10V8.7A3.5 3.5 0 0 1 12 5.2a3.5 3.5 0 0 1 3.5 3.5V10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="6.5" y="10" width="11" height="8.8" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8.5h3l1.3-2h7.4l1.3 2h3v10H4v-10Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13.5" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function StoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 5.5h10v13H7z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 9h4M10 13h4M10 17h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="m7 15 3-3 2.5 2.5L15 12l2 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="9.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="4.5" width="15" height="15" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="m10 9 5 3-5 3V9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 17.5V19l2.4-1.5H17a3 3 0 0 0 3-3v-5a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v5a3 3 0 0 0 2 2.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfinityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 15.5c-1.8 0-3.5-1.4-3.5-3.5S7.2 8.5 9 8.5c3.7 0 3.3 7 6 7 1.8 0 3.5-1.4 3.5-3.5S16.8 8.5 15 8.5c-2.7 0-2.3 7-6 7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.5 5.5c.6-.4 2.4-.6 3 .2l1 2c.4.7.2 1.5-.4 2l-1 1c1 2 2.6 3.6 4.6 4.6l1-1c.5-.6 1.3-.8 2-.4l2 1c.8.6.6 2.4.2 3-.5 1-1.6 1.6-2.7 1.5-7.3-.7-13.1-6.5-13.8-13.8-.1-1.1.5-2.2 1.5-2.7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.5 3c.3 2 1.5 3.7 3.4 4.7 1 .5 2 .8 3.1.8v3.1c-1.8 0-3.6-.5-5.1-1.5v5.8a5.9 5.9 0 1 1-5.1-5.8v3.2a2.7 2.7 0 1 0 1.9 2.6V3h1.3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12.2c0 2-.2 3.3-.5 4.1a2.8 2.8 0 0 1-1.6 1.6c-.8.3-2.3.5-6.9.5s-6.1-.2-6.9-.5a2.8 2.8 0 0 1-1.6-1.6C3.2 15.5 3 14.2 3 12.2s.2-3.3.5-4.1a2.8 2.8 0 0 1 1.6-1.6C5.9 6.2 7.4 6 12 6s6.1.2 6.9.5a2.8 2.8 0 0 1 1.6 1.6c.3.8.5 2.1.5 4.1Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="m10 9.4 5 2.8-5 2.8V9.4Z" fill="currentColor" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.7 4.2 3.9 10.7c-1.1.4-1.1 2 .1 2.4l4.2 1.4 1.6 4.9c.4 1.2 2 1.3 2.6.2l2.4-4.1 4.4-9c.5-1-.4-2.1-1.5-1.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="m8.6 14.3 8.7-7.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function TwitchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 4h13v9l-4 4h-3l-2.5 2.5V17H6V4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M10 8v4M14 8v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
