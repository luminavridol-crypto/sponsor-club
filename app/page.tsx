import Link from "next/link";
import Image from "next/image";
import { BrandShell } from "@/components/layout/brand-shell";
import { LogoMark } from "@/components/layout/logo-mark";
import { buildTelegramMiniAppLink } from "@/lib/telegram/links";

const socials = [
  {
    name: "Telegram",
    href: "https://t.me/lu_lu_f",
    icon: <TelegramIcon />,
    primary: true
  },
  {
    name: "Чат TG",
    href: "https://t.me/lu_lu_f1",
    icon: <ChatIcon />,
    primary: true
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
    name: "TikTok",
    href: "https://www.tiktok.com/@lumina5927",
    icon: <TikTokIcon />,
    primary: true
  },
  {
    name: "Twitch",
    href: "https://www.twitch.tv/luminaf",
    icon: <TwitchIcon />
  }
];

const clubInside = [
  {
    title: "Закрытые фото",
    text: "кадры, которые не уходят в открытую ленту",
    icon: "01",
    featured: true
  },
  {
    title: "Закулисье съёмок",
    text: "свет, образы, процесс и живые моменты до финального кадра",
    icon: "02"
  },
  {
    title: "Видео ближе к реальности",
    text: "короткие фрагменты, голос, движение и ощущение присутствия рядом",
    icon: "03",
    featured: true
  },
  {
    title: "Пилон-дневник",
    text: "прогресс, тренировки и то, что остаётся за кадром",
    icon: "04",
    featured: true
  },
  {
    title: "Косплей-процесс",
    text: "от идеи, деталей и макияжа до готового образа",
    icon: "05"
  },
  {
    title: "Ранний доступ",
    text: "новые материалы раньше открытых соцсетей",
    icon: "06",
    muted: true
  },
  {
    title: "Личные истории",
    text: "настроение, романтика, тьма, женственность и маленькие детали",
    icon: "07"
  },
  {
    title: "Тёмная сторона Lumina",
    text: "более закрытая атмосфера для старших уровней клуба",
    icon: "08",
    featured: true,
    dark: true
  }
];

const faqItems = [
  {
    question: "Как открыть доступ?",
    answer: "Выбираешь уровень на сайте, затем открываешь Telegram-приложение, отправляешь заявку и скрин оплаты. После подтверждения доступ открывается в клубе."
  },
  {
    question: "Куда приходит контент?",
    answer: "Основной доступ и обновления остаются внутри Telegram-приложения клуба."
  },
  {
    question: "Можно ли сменить уровень?",
    answer: "Да, уровень можно обновить позже, если захочешь больше контента и более закрытую атмосферу."
  }
];

// Редактируй тексты тарифов здесь.
const homeTariffs = [
  {
    badge: "tier 01",
    title: "Тариф Спутник",
    eyebrow: "мягкий вход",
    level: "Уровень доступа: базовый",
    price: "10 EUR / месяц",
    teaser: "Для тех, кто хочет поддержать и видеть больше, чем в открытых соцсетях.",
    promise: "Первый шаг в закрытую атмосферу: больше кадров, больше раннего доступа, больше ощущения присутствия.",
    note: "",
    symbol: "S",
    cardClass:
      "border-slate-200/18 bg-[radial-gradient(circle_at_top_left,rgba(226,232,240,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(120,231,255,0.10),transparent_32%),linear-gradient(145deg,rgba(15,18,30,0.96),rgba(6,7,15,0.98))]",
    glowClass: "bg-cyanGlow/12",
    priceClass: "border-slate-100/22 bg-white/8 text-slate-100",
    titleClass: "text-slate-50",
    accentClass: "text-cyanGlow",
    bulletClass: "bg-cyanGlow shadow-[0_0_14px_rgba(120,231,255,0.78)]",
    sections: [
      {
        title: "Что внутри",
        label: "early access",
        items: [
          "Ранний доступ к фото и видео",
          "Все липсинги, даже те которые не публикуются",
          "Запись прохождение раньше всех",
          "Личные сообщение - лимит 20 в месяц"
        ]
      }
    ]
  },
  {
    badge: "tier 02",
    title: "Тариф Insider",
    eyebrow: "inner circle",
    level: "Уровень доступа: расширенный",
    price: "25 EUR / месяц",
    teaser: "Backstage, личные заметки, процесс создания образов и ранний доступ.",
    promise: "Для тех, кто хочет видеть, как рождается атмосфера: от идеи и образа до финального материала.",
    note: "INNER CIRCLE",
    symbol: "I",
    cardClass:
      "border-fuchsia-300/24 bg-[radial-gradient(circle_at_top_left,rgba(255,79,216,0.23),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.18),transparent_32%),linear-gradient(145deg,rgba(34,10,36,0.97),rgba(10,8,22,0.98))]",
    glowClass: "bg-accent/18",
    priceClass: "border-fuchsia-200/30 bg-fuchsia-300/12 text-accentSoft",
    titleClass: "text-fuchsia-50",
    accentClass: "text-accentSoft",
    bulletClass: "bg-accentSoft shadow-[0_0_14px_rgba(255,158,238,0.78)]",
    sections: [
      {
        title: "Что внутри",
        label: "core access",
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
        items: [
          "Бонусный контент и сливы",
          "Обои для телефона",
          "ИИ-арты по пожеланию",
          "Один контент-запрос в месяц"
        ]
      }
    ]
  },
  {
    badge: "tier 03",
    title: "Тариф VIP",
    eyebrow: "premium priority",
    level: "Уровень доступа: максимальный",
    price: "50 EUR / месяц",
    teaser: "Приоритетное внимание, больше личного контента, закрытые видео/фото и особые обновления.",
    promise: "Для тех, кто хочет не просто доступ, а ощущение, что его присутствие действительно важно.",
    note: "MOST POPULAR",
    symbol: "V",
    cardClass:
      "border-amber-200/32 bg-[radial-gradient(circle_at_top_left,rgba(255,226,168,0.30),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.18),transparent_32%),linear-gradient(145deg,rgba(45,28,10,0.98),rgba(13,8,7,0.99))]",
    glowClass: "bg-goldSoft/18",
    priceClass: "border-amber-100/34 bg-amber-200/13 text-goldSoft",
    titleClass: "text-goldSoft",
    accentClass: "text-goldSoft",
    bulletClass: "bg-goldSoft shadow-[0_0_16px_rgba(255,226,168,0.82)]",
    sections: [
      {
        title: "Что внутри",
        label: "premium access",
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
    badge: "tier 04",
    title: "After Dark",
    eyebrow: "dark exclusive",
    level: "Уровень доступа: самый закрытый",
    price: "80 EUR / месяц",
    teaser: "Самый закрытый уровень: тёмная эстетика, откровенная атмосфера, эксклюзивные фотосеты и приватные материалы.",
    promise: "Для тех, кто хочет редкий формат, куда не ведут открытые соцсети.",
    note: "EXCLUSIVE ACCESS",
    symbol: "D",
    cardClass:
      "border-violet-300/32 bg-[radial-gradient(circle_at_top_left,rgba(167,139,250,0.24),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,79,216,0.16),transparent_30%),linear-gradient(145deg,rgba(8,5,18,0.99),rgba(2,2,5,1))]",
    glowClass: "bg-violet-400/18",
    priceClass: "border-violet-200/34 bg-violet-300/12 text-violet-100",
    titleClass: "text-violet-50",
    accentClass: "text-violet-100",
    bulletClass: "bg-violet-200 shadow-[0_0_16px_rgba(221,214,254,0.72)]",
    sections: [
      {
        title: "Что внутри",
        label: "restricted archive",
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

export default function HomePage() {
  const telegramMiniAppTariffsHref = buildTelegramMiniAppLink("tiers") ?? "https://t.me/SponsorClubLumina_bot";

  return (
    <BrandShell>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[4%] top-[18%] h-72 w-72 rounded-full bg-cyanGlow/8 blur-[110px]" />
          <div className="absolute right-[6%] top-[6%] h-80 w-80 rounded-full bg-accent/12 blur-[120px]" />
          <div className="absolute bottom-[12%] left-[8%] h-60 w-60 rounded-full bg-accent/10 blur-[110px]" />
          <div className="absolute bottom-0 right-[10%] h-72 w-72 rounded-full bg-cyanGlow/6 blur-[120px]" />
        </div>

        <section className="relative mx-auto max-w-[96rem] px-4 pb-20 pt-10 sm:px-6 sm:pb-28 sm:pt-16 lg:min-h-[calc(100vh-7rem)] lg:pb-20">
          <div className="grid min-h-[35rem] items-center gap-10 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="text-center lg:text-left">
              <div className="flex justify-center lg:justify-start">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-white/12 bg-white/[0.04] shadow-[0_0_44px_rgba(255,79,216,0.2)]">
                  <LogoMark className="h-11 w-11" />
                </div>
              </div>

              <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.34em] text-accentSoft">
                не для открытых соцсетей
              </p>
              <h1 className="font-display mt-5 max-w-3xl text-[2.8rem] leading-[0.95] text-white sm:text-[4.6rem] lg:text-[5.6rem]">
                Закрытая сторона
                <br />
                <span className="bg-gradient-to-r from-white via-accentSoft to-cyanGlow bg-clip-text text-transparent">
                  Lumina
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/74 sm:text-xl sm:leading-9">
                Место для тех, кто хочет видеть больше, чем попадает в открытую ленту: backstage,
                атмосферные фото, личные видео, косплей-процесс и моменты ближе к настоящей мне.
              </p>
              <p className="mt-5 max-w-xl text-base leading-8 text-white/55">
                Это не просто подписка. Это дверь в ту часть Lumina, которую не видят случайные зрители.
              </p>

              <div className="mt-9 flex flex-col items-stretch gap-4 sm:items-center lg:items-start">
                <Link
                  href="#club-terms"
                  className="inline-flex w-full items-center justify-center gap-3 rounded-[1.25rem] border border-accent/45 bg-gradient-to-r from-accent/80 via-[#c458f6] to-[#6f3ff4] px-6 py-4 text-base font-medium text-white shadow-[0_10px_40px_rgba(255,79,216,0.28)] transition hover:scale-[1.01] hover:brightness-110 sm:w-auto sm:min-w-[19rem]"
                >
                  <DiamondButtonIcon />
                  <span>Выбрать свой уровень доступа</span>
                </Link>
              </div>

              <div className="mt-8 max-w-2xl">
                <p className="text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40 lg:text-left">
                  ссылки и связь
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {socials.map((social) => (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      className={`group flex min-w-0 items-center gap-3 rounded-[1.1rem] px-3 py-3 text-white/90 transition sm:px-4 ${
                        social.primary
                          ? "border border-accentSoft/46 bg-[radial-gradient(circle_at_top_left,rgba(255,79,216,0.22),transparent_42%),linear-gradient(180deg,rgba(255,79,216,0.14),rgba(109,223,255,0.06))] shadow-[0_0_0_1px_rgba(255,158,238,0.08),0_0_32px_rgba(255,79,216,0.22)] hover:border-accentSoft/70 hover:shadow-[0_0_0_1px_rgba(255,158,238,0.16),0_0_42px_rgba(255,79,216,0.34)]"
                          : "border border-accent/28 bg-[linear-gradient(180deg,rgba(255,79,216,0.08),rgba(255,255,255,0.028))] shadow-[0_0_0_1px_rgba(255,79,216,0.04),0_0_18px_rgba(255,79,216,0.08)] hover:border-accent/46 hover:bg-[linear-gradient(180deg,rgba(255,79,216,0.12),rgba(109,223,255,0.045))]"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-accentSoft ${
                          social.primary
                            ? "border-accentSoft/50 bg-accent/18 shadow-[0_0_24px_rgba(255,79,216,0.34)]"
                            : "border-accent/32 bg-accent/10 shadow-[0_0_16px_rgba(255,79,216,0.16)]"
                        }`}
                      >
                        {social.icon}
                      </span>
                      <span className="truncate text-sm font-medium">{social.name}</span>
                    </a>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm leading-6 text-white/50 lg:justify-start">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-white/32">Сотрудничество</span>
                  <a
                    href="mailto:lumina.vr.idol@gmail.com"
                    className="font-medium text-accentSoft/90 decoration-accentSoft/30 underline-offset-4 hover:text-white hover:underline"
                  >
                    lumina.vr.idol@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <div className="relative min-h-[30rem] overflow-hidden rounded-[2.35rem] border border-white/10 bg-black/30 shadow-[0_30px_100px_rgba(0,0,0,0.48)] sm:min-h-[42rem] lg:min-h-[46rem]">
              <Image
                src="/lumina-hero.jpg"
                alt="Lumina в красном свете"
                fill
                priority
                sizes="(min-width: 1024px) 680px, 100vw"
                className="absolute inset-0 h-full w-full object-cover object-[50%_34%] opacity-90"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,7,17,0.62),rgba(6,7,17,0.10)_48%,rgba(6,7,17,0.38)),linear-gradient(180deg,rgba(6,7,17,0.02),rgba(6,7,17,0.60))]" />
              <div className="absolute bottom-5 left-5 right-5 sm:bottom-7 sm:left-7 sm:right-7">
                <div className="max-w-[24rem] rounded-[1.4rem] border border-white/10 bg-black/24 px-4 py-4 backdrop-blur-[2px] sm:px-5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-white/48">закрытая атмосфера</p>
                  <p className="mt-2 text-[1rem] font-medium leading-7 text-white/82 sm:text-[1.12rem]">
                    ближе к образам, закулисью и моментам, которые остаются только внутри клуба
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-[88rem] px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-accentSoft [text-shadow:0_0_18px_rgba(255,79,216,0.62)] sm:text-base">
              Что внутри клуба
            </p>
            <h2 className="font-display mt-4 text-3xl leading-tight text-white sm:text-5xl">
              Не контент ради контента, а настроение, которое нельзя вынести в открытую ленту.
            </h2>
          </div>

          <div className="relative mt-10 overflow-hidden rounded-[2.2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,79,216,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(120,231,255,0.10),transparent_30%),linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)] sm:p-6">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accentSoft/70 to-transparent" />
            <div className="pointer-events-none absolute -left-16 top-10 h-40 w-40 rounded-full bg-accent/14 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 bottom-4 h-44 w-44 rounded-full bg-cyanGlow/10 blur-3xl" />

            <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {clubInside.map((item) => (
                <div
                  key={item.title}
                  className={`group relative min-h-[13rem] overflow-hidden rounded-[1.35rem] border p-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_42px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-0.5 ${
                    item.dark
                      ? "border-violet-200/24 bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.24),transparent_34%),linear-gradient(180deg,rgba(18,8,34,0.92),rgba(5,5,12,0.72))] hover:border-violet-100/42"
                      : item.featured
                        ? "border-accentSoft/24 bg-[radial-gradient(circle_at_top_right,rgba(255,79,216,0.18),transparent_34%),linear-gradient(180deg,rgba(32,10,30,0.88),rgba(8,9,19,0.60))] hover:border-accentSoft/44"
                        : item.muted
                          ? "border-white/8 bg-[linear-gradient(180deg,rgba(8,9,19,0.68),rgba(8,9,19,0.46))] opacity-85 hover:border-white/16"
                          : "border-white/10 bg-[linear-gradient(180deg,rgba(8,9,19,0.82),rgba(8,9,19,0.54))] hover:border-accentSoft/30"
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition ${
                      item.dark ? "bg-violet-300/18" : item.featured ? "bg-accent/22" : "bg-accent/12"
                    }`}
                  />
                  <div className="relative flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full border font-display text-sm shadow-[0_0_22px_rgba(255,79,216,0.18)] ${
                          item.dark
                            ? "border-violet-100/28 bg-violet-300/14 text-violet-100"
                            : item.featured
                              ? "border-accentSoft/30 bg-accent/16 text-accentSoft"
                              : "border-white/14 bg-white/6 text-white/58"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span
                        className={`h-px flex-1 bg-gradient-to-r ${
                          item.dark ? "from-violet-100/34" : item.featured ? "from-accentSoft/36" : "from-white/16"
                        } to-transparent`}
                      />
                    </div>

                    <div className="pt-8">
                      <h3 className={`font-semibold leading-6 ${item.featured || item.dark ? "text-xl text-white" : "text-lg text-white/88"}`}>
                        {item.title}
                      </h3>
                      <p className={`mt-3 text-sm leading-6 ${item.muted ? "text-white/42" : "text-white/58"}`}>{item.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="relative mt-4 rounded-[1.35rem] border border-accent/18 bg-black/18 px-5 py-4 text-center text-base leading-7 text-white/66">
              Это не просто папка с файлами. Это закрытое пространство с настроением, процессом и той частью Lumina, которую не видно снаружи.
            </div>
          </div>
        </section>

        <section id="club-terms" className="relative mx-auto max-w-[88rem] scroll-mt-8 px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-accentSoft [text-shadow:0_0_18px_rgba(255,79,216,0.62)] sm:text-base">
              Выбрать уровень доступа
            </p>
            <h2 className="font-display mt-4 text-3xl leading-tight text-white sm:text-5xl">
              Выбери, насколько близко ты хочешь зайти.
            </h2>
          </div>

          <div className="mt-10 grid items-start gap-5 sm:grid-cols-2">
            {homeTariffs.map((tariff) => (
              <details
                key={tariff.badge}
                className={`group relative overflow-hidden rounded-[1.6rem] border shadow-[0_20px_60px_rgba(0,0,0,0.34)] transition duration-500 open:shadow-[0_28px_80px_rgba(0,0,0,0.46)] hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(0,0,0,0.46)] [&_summary::-webkit-details-marker]:hidden ${tariff.cardClass}`}
              >
                <div className={`pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full blur-3xl ${tariff.glowClass}`} />
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                <div className="pointer-events-none absolute bottom-4 right-5 font-display text-[8rem] leading-none text-white/[0.035] transition duration-500 group-hover:text-white/[0.06]">
                  {tariff.symbol}
                </div>

                <summary className="relative flex min-h-[23rem] cursor-pointer list-none flex-col p-4 outline-none transition sm:min-h-[24rem] sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="rounded-full border border-white/10 bg-black/22 px-2.5 py-1 text-[9px] uppercase tracking-[0.24em] text-white/46">
                          {tariff.badge}
                        </p>
                        <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${tariff.accentClass}`}>
                          {tariff.eyebrow}
                        </p>
                      </div>

                      <h3 className={`mt-4 font-display text-[1.55rem] leading-[0.98] sm:text-[2.05rem] ${tariff.titleClass}`}>
                        {tariff.title}
                      </h3>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
                        {tariff.level}
                      </p>
                    </div>

                    <div className={`shrink-0 rounded-[1rem] border px-3 py-2 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${tariff.priceClass}`}>
                      <p className="text-[9px] uppercase tracking-[0.22em] text-white/45">доступ</p>
                      <p className="mt-1 text-sm font-bold sm:text-base">{tariff.price}</p>
                    </div>
                  </div>

                  <p className="mt-5 text-[0.98rem] font-medium leading-6 text-white/86">{tariff.teaser}</p>
                  <p className="mt-2 text-sm leading-6 text-white/58">{tariff.promise}</p>
                  {tariff.note ? (
                    <p className="mt-4 inline-flex w-fit rounded-full border border-white/12 bg-black/24 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      {tariff.note}
                    </p>
                  ) : null}

                  <div className="mt-auto pt-6">
                    <div className={`inline-flex w-full items-center justify-between gap-3 rounded-[1rem] border px-4 py-3 text-sm font-semibold transition group-open:bg-white/10 ${tariff.priceClass}`}>
                      <span>{`Выбрать ${tariff.title.replace("Тариф ", "")}`}</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/16 bg-black/20 text-lg leading-none transition duration-300 group-open:rotate-180">
                        ↓
                      </span>
                    </div>
                  </div>
                </summary>

                <div className="relative border-t border-white/10 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                  <div className="space-y-3">
                    {tariff.sections.map((section) => (
                      <section key={`${tariff.badge}-${section.title}`} className="rounded-[1.15rem] border border-white/9 bg-black/18 p-3.5">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.22em] text-white/36">{section.label}</p>
                            <h4 className={`mt-1 text-sm font-semibold ${tariff.accentClass}`}>{section.title}</h4>
                          </div>
                          <div className="h-px flex-1 bg-gradient-to-r from-white/16 to-transparent" />
                        </div>

                        <ul className="mt-3 grid gap-2">
                          {section.items.map((item) => (
                            <li
                              key={item}
                              className="flex gap-2.5 rounded-[0.85rem] border border-white/7 bg-black/18 px-3 py-2.5 text-sm leading-5 text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                            >
                              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tariff.bulletClass}`} />
                              <span className="min-w-0">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-2xl rounded-[1.6rem] border border-accent/24 bg-[radial-gradient(circle_at_top,rgba(255,79,216,0.18),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 text-center shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <p className="text-sm leading-6 text-white/66">
              Когда выберешь уровень, открой Telegram-приложение: там уже есть тарифы, заявка и оплата.
            </p>
            <a
              href={telegramMiniAppTariffsHref}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-3 rounded-[1.15rem] border border-accentSoft/50 bg-gradient-to-r from-accent/85 via-[#c458f6] to-[#6f3ff4] px-5 py-4 text-base font-semibold text-white shadow-[0_14px_46px_rgba(255,79,216,0.32)] transition hover:scale-[1.01] hover:brightness-110 sm:w-auto sm:min-w-[20rem]"
            >
              <TelegramIcon />
              <span>Открыть тарифы и оплату в Telegram</span>
            </a>
          </div>
        </section>

        <section className="relative mx-auto max-w-[72rem] px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-accentSoft [text-shadow:0_0_18px_rgba(255,79,216,0.62)] sm:text-base">
              Важное
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {faqItems.map((item) => (
              <div key={item.question} className="rounded-[1.35rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_52px_rgba(0,0,0,0.2)]">
                <h3 className="text-base font-semibold text-white">{item.question}</h3>
                <p className="mt-3 text-sm leading-6 text-white/58">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </BrandShell>
  );
}

function DiamondButtonIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m7 8 2.4-3h5.2L17 8l-5 9-5-9Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M4 8h16M9.4 5 12 8l2.6-3M12 8v9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.5 3c.3 2 1.5 3.7 3.4 4.7 1 .5 2 .8 3.1.8v3.1c-1.8 0-3.6-.5-5.1-1.5v5.8a5.9 5.9 0 1 1-5.1-5.8v3.2a2.7 2.7 0 1 0 1.9 2.6V3h1.3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect height="17" rx="5" stroke="currentColor" strokeWidth="1.7" width="17" x="3.5" y="3.5" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.5" cy="6.5" fill="currentColor" r="1" />
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
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path d="m8.6 14.3 8.7-7.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function TwitchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 4h13v9l-4 4h-3l-2.5 2.5V17H6V4Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path d="M10 8v4M14 8v4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 6.5h14A1.5 1.5 0 0 1 20.5 8v8a1.5 1.5 0 0 1-1.5 1.5H9L4.5 20v-4H5A1.5 1.5 0 0 1 3.5 14.5V8A1.5 1.5 0 0 1 5 6.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path d="M8 10h8M8 13.5h5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}
