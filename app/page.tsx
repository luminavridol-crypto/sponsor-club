import Image from "next/image";
import Link from "next/link";
import { createPurchaseRequestAction } from "@/app/actions";
import { BrandShell } from "@/components/layout/brand-shell";
import { LogoMark } from "@/components/layout/logo-mark";
import { getViewerKind, hasClubAccess } from "@/lib/auth/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";

const steps = [
  {
    number: "01",
    title: "Выбираешь tier",
    text: "Смотри, что тебе ближе."
  },
  {
    number: "02",
    title: "Получаешь доступ",
    text: "После активации заходишь в клуб."
  },
  {
    number: "03",
    title: "Смотришь контент",
    text: "Фото, видео и редкие материалы."
  }
];

const sellingTierCards = [
  {
    tier: "Tier 1",
    name: "Наблюдатель",
    price: "10 EUR / месяц",
    image: "/tiers/tier-1-small.jpg",
    glow: "border-accent/20 shadow-glow",
    lockTone: "border-accent/35 bg-accent/12 text-accentSoft",
    badge: "Лёгкий вход",
    summary:
      "Первый ключ в закрытый мир Lumina: ранний контент, закулисье и материалы, которые не выходят в открытый доступ.",
    fit: "быть внутри клуба и видеть контент раньше остальных.",
    cta: "Войти в закрытый мир",
    note: "Идеальный вход в закрытый клуб.",
    points: ["Ранний доступ", "Закулисье", "Редкий закрытый контент"]
  },
  {
    tier: "Tier 2",
    name: "Приближённый",
    price: "25 EUR / месяц",
    image: "/tiers/tier-2-small.jpg",
    glow: "border-accent/35 shadow-glow ring-1 ring-accent/40",
    lockTone: "border-accent/40 bg-accent/14 text-accentSoft",
    badge: "Лучший выбор",
    summary:
      "Расширенный доступ к внутреннему пространству Lumina. Больше закулисья, больше бонусов и больше участия в создании контента.",
    fit: "быть ближе к процессу, а не просто наблюдать со стороны.",
    cta: "Стать приближённым",
    note: "Самый сбалансированный уровень клуба.",
    points: ["Всё из Tier 1", "Бонусные материалы", "Больше участия в процессе"],
    featured: true
  },
  {
    tier: "Tier 3",
    name: "VIP",
    price: "50 EUR / месяц",
    image: "/tiers/tier-3-small.jpg",
    glow: "border-cyanGlow/28 shadow-cyan",
    lockTone: "border-cyanGlow/35 bg-cyanGlow/12 text-cyanGlow",
    badge: "Максимальная глубина",
    summary:
      "Самый глубокий уровень доступа: редкие материалы, персональные бонусы, личное внимание и статус внутри клуба.",
    fit: "максимум доступа и место в самом близком круге.",
    cta: "Открыть VIP",
    note: "Для тех, кто хочет максимум.",
    points: ["Редчайшие материалы", "Личное внимание", "Особый статус внутри клуба"]
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
  const { data: profileData } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null };
  const profile = (profileData as Profile | null) ?? null;
  const viewerKind = getViewerKind(profile);
  const params = (await searchParams) ?? {};
  const inviteRequestSent =
    (Array.isArray(params.inviteRequestSent)
      ? params.inviteRequestSent[0]
      : params.inviteRequestSent) === "1";
  const inviteRequestError =
    (Array.isArray(params.inviteRequestError)
      ? params.inviteRequestError[0]
      : params.inviteRequestError) === "1";

  const hasPrivateClubAccess = hasClubAccess(profile);
  const clubHref = hasPrivateClubAccess ? "/club" : "#invitation-request";

  return (
    <BrandShell
      rightSlot={
        viewerKind === "admin" ? (
          <Link
            href="/cabinet"
            className="inline-flex w-full rounded-2xl border border-accent/35 bg-accent/10 px-4 py-2 text-center text-sm text-accentSoft transition hover:bg-accent/20 sm:w-auto sm:justify-center"
          >
            Кабинет
          </Link>
        ) : user ? (
          <Link
            href={hasPrivateClubAccess ? "/club" : "/dashboard"}
            className="inline-flex w-full rounded-2xl border border-accent/35 bg-accent/10 px-4 py-2 text-center text-sm text-accentSoft transition hover:bg-accent/20 sm:w-auto sm:justify-center"
          >
            {hasPrivateClubAccess ? "Войти" : "Профиль"}
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex w-full rounded-2xl border border-accent/35 bg-accent/10 px-4 py-2 text-center text-sm text-accentSoft transition hover:bg-accent/20 sm:w-auto sm:justify-center"
          >
            Войти
          </Link>
        )
      }
    >
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[4%] top-[18%] h-72 w-72 rounded-full bg-cyanGlow/8 blur-[110px]" />
          <div className="absolute right-[6%] top-[6%] h-80 w-80 rounded-full bg-accent/12 blur-[120px]" />
          <div className="absolute bottom-[12%] left-[8%] h-60 w-60 rounded-full bg-accent/10 blur-[110px]" />
          <div className="absolute bottom-0 right-[10%] h-72 w-72 rounded-full bg-cyanGlow/6 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-[96rem] px-4 pb-14 pt-8 sm:px-6 sm:pb-20 sm:pt-12">
          <div className="relative overflow-hidden rounded-[2.2rem] border border-accent/18 bg-[#060711]/92 px-5 py-8 shadow-glow sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,79,216,0.18),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(109,223,255,0.08),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />
            <div className="pointer-events-none absolute -right-12 top-14 h-80 w-80 rounded-full border border-accent/15" />
            <div className="pointer-events-none absolute -left-24 bottom-[-7rem] h-64 w-64 rounded-full border border-accent/10" />

            <div className="relative mx-auto max-w-4xl text-center">
              <div className="inline-flex max-w-full items-center gap-3 rounded-full border border-accent/45 bg-accent/8 px-4 py-2.5 text-[10px] uppercase tracking-[0.28em] text-accentSoft sm:px-5 sm:text-[11px]">
                <LockBadgeIcon />
                <span className="truncate">Закрытый клуб Lumina</span>
              </div>

              <div className="mt-7 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-white/12 bg-white/[0.04] shadow-[0_0_44px_rgba(255,79,216,0.2)]">
                  <LogoMark className="h-11 w-11" />
                </div>
              </div>

              <h1 className="font-display mx-auto mt-7 max-w-3xl text-[1.9rem] leading-[1.08] tracking-[-0.03em] text-white sm:text-[2.45rem] lg:text-[3.15rem]">
                Пространство, где
                <br />
                <span className="bg-gradient-to-r from-white via-accentSoft to-cyanGlow bg-clip-text text-transparent">
                  Lumina становится ближе
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/62 sm:text-[15px] sm:leading-8">
                Закрытый клуб для тех, кто хочет видеть больше обычных соцсетей:
                камерные материалы, атмосферные фото, личные видео и ощущение
                настоящего присутствия рядом.
              </p>

              <div className="mx-auto mt-7 flex max-w-3xl items-center">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/30 to-accent/10" />
                <div className="mx-3 h-[3px] w-14 rounded-full bg-accent shadow-[0_0_20px_rgba(255,79,216,0.95)]" />
                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-accent/30 to-accent/10" />
              </div>

              <div className="mt-8 flex flex-col items-stretch gap-4 sm:items-center">
                <Link
                  href={clubHref}
                  target={hasPrivateClubAccess ? "_blank" : undefined}
                  rel={hasPrivateClubAccess ? "noreferrer" : undefined}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-[1.25rem] border border-accent/45 bg-gradient-to-r from-accent/80 via-[#c458f6] to-[#6f3ff4] px-5 py-3.5 text-base font-medium text-white shadow-[0_10px_40px_rgba(255,79,216,0.28)] transition hover:scale-[1.01] hover:brightness-110 sm:w-auto sm:min-w-[19rem]"
                >
                  <DiamondButtonIcon />
                  <span>Перейти в закрытый клуб</span>
                </Link>
              </div>

              <div className="mx-auto mt-8 max-w-4xl">
                <p className="text-sm font-semibold uppercase tracking-[0.34em] text-accentSoft [text-shadow:0_0_18px_rgba(255,79,216,0.62)] sm:text-base">
                  Мои соцсети
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-center">
                  {socials.map((social) => (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex min-w-0 items-center gap-3 rounded-[1.1rem] border border-accent/40 bg-[linear-gradient(180deg,rgba(255,79,216,0.12),rgba(255,255,255,0.04))] px-3 py-3 text-white/92 shadow-[0_0_0_1px_rgba(255,79,216,0.08),0_0_26px_rgba(255,79,216,0.16)] transition hover:border-accent/65 hover:bg-[linear-gradient(180deg,rgba(255,79,216,0.18),rgba(109,223,255,0.08))] hover:shadow-[0_0_0_1px_rgba(255,79,216,0.15),0_0_34px_rgba(255,79,216,0.28)] sm:px-4"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/45 bg-accent/14 text-accentSoft shadow-[0_0_24px_rgba(255,79,216,0.28)] sm:h-10 sm:w-10">
                        {social.icon}
                      </span>
                      <span className="truncate text-sm font-medium [text-shadow:0_0_12px_rgba(255,79,216,0.15)]">
                        {social.name}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="tiers" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">
              Уровни доступа
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white sm:text-[2.8rem]">
              Выбери <span className="text-accentSoft">глубину</span> доступа
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/58 sm:text-base sm:leading-8">
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
              <p className="text-base font-medium text-accentSoft sm:text-lg">
                Только для участников клуба
              </p>
              <p className="mt-1 text-base leading-7 text-white/48">
                Контент скрыт до получения доступа
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {sellingTierCards.map((tier) => (
            <article
              key={tier.tier}
              className={`relative flex h-full flex-col overflow-hidden rounded-[30px] border bg-[#0a0b14] ${tier.glow} ${
                tier.featured ? "lg:-translate-y-3 lg:scale-[1.02]" : ""
              }`}
            >
              <div className="relative h-[230px] overflow-hidden border-b border-white/10 sm:h-[280px]">
                <Image
                  src={tier.image}
                  alt={tier.name}
                  fill
                  priority={tier.tier === "Tier 1"}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/10 to-[#0a0b14]" />
                <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-5 sm:p-6">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-white/78">{tier.tier}</p>
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${
                      tier.featured
                        ? "border-accent/45 bg-accent/18 text-accentSoft shadow-[0_0_22px_rgba(255,79,216,0.22)]"
                        : tier.tier === "Tier 3"
                          ? "border-cyanGlow/35 bg-cyanGlow/12 text-cyanGlow"
                          : "border-white/15 bg-black/25 text-white/72"
                    }`}
                  >
                    {tier.badge}
                  </span>
                </div>
                <div className="absolute bottom-5 left-5 sm:left-6">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur-md ${tier.lockTone}`}
                  >
                    <LockBadgeIcon />
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col px-5 pb-6 pt-5 sm:px-6 sm:pb-7">
                <div className="border-b border-white/10 pb-5">
                  <div className="flex items-end justify-between gap-4">
                    <h3 className="text-[1.5rem] font-semibold leading-tight text-white sm:text-[1.8rem]">
                      {tier.name}
                    </h3>
                    {tier.featured ? (
                      <span className="rounded-full border border-accent/35 bg-accent/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-accentSoft">
                        Рекомендуем
                      </span>
                    ) : null}
                  </div>
                  <p
                    className={`mt-3 text-lg font-medium ${
                      tier.tier === "Tier 3" ? "text-cyanGlow" : "text-accentSoft"
                    }`}
                  >
                    {tier.price}
                  </p>
                  <p className="mt-4 text-[15px] leading-7 text-white/78">{tier.summary}</p>
                </div>

                <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/38">Подходит, если ты хочешь</p>
                  <p className="mt-3 text-sm leading-7 text-white/86 sm:text-[15px]">{tier.fit}</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  {tier.points.map((point) => (
                    <span
                      key={point}
                      className={`inline-flex items-center rounded-full border px-3 py-2 text-sm ${
                        tier.tier === "Tier 3"
                          ? "border-cyanGlow/20 bg-cyanGlow/8 text-cyanGlow"
                          : tier.featured
                            ? "border-accent/30 bg-accent/10 text-accentSoft"
                            : "border-white/12 bg-white/[0.03] text-white/70"
                      }`}
                    >
                      {point}
                    </span>
                  ))}
                </div>

                <div className="mt-6 flex flex-1 flex-col justify-end gap-4">
                  <Link
                    href="#invitation-request"
                    className={`inline-flex min-h-[56px] items-center justify-center rounded-[1.1rem] px-5 text-center text-base font-semibold text-white transition hover:brightness-110 ${
                      tier.tier === "Tier 3"
                        ? "border border-cyanGlow/35 bg-gradient-to-r from-[#4e77ff] via-[#8b6cff] to-[#f05ed2] shadow-[0_0_28px_rgba(109,223,255,0.18)]"
                        : tier.featured
                          ? "border border-accent/45 bg-gradient-to-r from-accent via-[#d355f6] to-[#8a52ff] shadow-[0_0_34px_rgba(255,79,216,0.28)]"
                          : "border border-accent/30 bg-white/[0.05] shadow-[0_0_22px_rgba(255,79,216,0.12)]"
                    }`}
                  >
                    {tier.cta}
                  </Link>
                  <p className="text-center text-sm leading-6 text-white/48">{tier.note}</p>
                </div>
              </div>
            </article>
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
                  <p className="text-base font-medium text-accentSoft sm:text-lg">{item.title}</p>
                  <p className="mt-1 text-base leading-7 text-white/55 sm:text-[1.05rem]">{item.text}</p>
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
                className="mt-3 text-[1.65rem] leading-[1.08] text-white sm:text-[2.2rem]"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                Хочешь попасть внутрь?
              </h3>
              <p className="mt-4 text-sm leading-7 text-white/62 sm:text-base sm:leading-8">
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
                className="mt-4 text-[1.65rem] leading-[1.08] text-white sm:text-[2.2rem]"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                Расскажи, как
                <br />
                с тобой связаться
              </h3>
              <p className="mt-4 max-w-xl text-base leading-7 text-white/62 sm:text-[1.05rem]">
                Эти данные попадут только в мой рабочий кабинет. После этого я смогу
                написать тебе лично и обсудить детали доступа.
              </p>
              <div className="mt-7 grid max-w-xl gap-3">
                {steps.map((step) => (
                  <div
                    key={step.number}
                    className="flex items-start gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/35 bg-accent/10 text-[11px] font-semibold tracking-[0.22em] text-accentSoft">
                      {step.number}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-white/55">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
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
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                />
                <label className="block">
                  <span className="mb-2 block text-sm text-white/68">Имя</span>
                  <input
                    type="text"
                    name="displayName"
                    required
                    maxLength={80}
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
                    maxLength={120}
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
                    maxLength={80}
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
                      maxLength={160}
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
              <h2 className="mt-3 text-xl font-semibold text-white sm:text-[2rem]">
                Если тебе нравится мой контент — ты точно захочешь увидеть больше
              </h2>
              <p className="mt-4 text-base leading-7 text-white/65">
                Закрытый клуб создан для тех, кто хочет быть ближе, видеть больше и
                получать самое ценное раньше остальных.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={clubHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-white px-5 py-3 text-center font-medium text-background transition hover:bg-goldSoft"
              >
                Открыть закрытый клуб
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
