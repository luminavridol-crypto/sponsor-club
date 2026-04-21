import Link from "next/link";
import { BrandShell } from "@/components/layout/brand-shell";

const features = [
  "Закрытый доступ по приглашениям",
  "3 уровня спонсорского контента",
  "Фото, видео, тексты и объявления",
  "Мобильный премиальный интерфейс"
];

export default function HomePage() {
  return (
    <BrandShell
      rightSlot={
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-accent/40 hover:text-white"
          >
            Вход
          </Link>
          <Link
            href="/invite"
            className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-background transition hover:bg-goldSoft"
          >
            Войти по invite
          </Link>
        </div>
      }
    >
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-accentSoft">
              Private sponsor-only web app
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-white sm:text-6xl">
              Закрытый клуб с эксклюзивным контентом, доступным только по приглашению.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
              Элегантная тёмная платформа для спонсоров и фанатов: контент по tier-уровням,
              приватный доступ, уютный премиальный интерфейс и удобная мобильная лента.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/login"
                className="rounded-2xl bg-white px-5 py-3 font-medium text-background transition hover:bg-goldSoft"
              >
                Войти
              </Link>
              <Link
                href="/invite"
                className="rounded-2xl border border-accent/40 bg-accent/10 px-5 py-3 font-medium text-accentSoft transition hover:bg-accent/20"
              >
                Регистрация по invite
              </Link>
            </div>
          </div>

          <div className="glass-card overflow-hidden p-6 shadow-glow">
            <div className="rounded-[24px] border border-white/10 bg-gradient-to-br from-accent/15 via-transparent to-cyanGlow/10 p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-white/45">Что внутри</p>
              <div className="mt-6 space-y-4">
                {features.map((feature) => (
                  <div
                    key={feature}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white/80"
                  >
                    {feature}
                  </div>
                ))}
              </div>
              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/45">Tier 1</p>
                  <p className="mt-2 text-2xl font-semibold">01</p>
                </div>
                <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4">
                  <p className="text-xs text-accentSoft">Tier 2</p>
                  <p className="mt-2 text-2xl font-semibold text-white">02</p>
                </div>
                <div className="rounded-2xl border border-cyanGlow/30 bg-cyanGlow/10 p-4">
                  <p className="text-xs text-cyanGlow">Tier 3</p>
                  <p className="mt-2 text-2xl font-semibold text-white">03</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </BrandShell>
  );
}
