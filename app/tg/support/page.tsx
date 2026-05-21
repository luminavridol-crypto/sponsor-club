export const dynamic = "force-dynamic";

import { createTelegramPurchaseRequestAction } from "@/app/actions";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { hasClubAccess } from "@/lib/auth/access";
import { requireAnyProfile } from "@/lib/auth/guards";
import { Tier } from "@/lib/types";

const tierCards: Array<{
  tier: Tier;
  label: string;
  price: string;
  accent: string;
  summary: string;
  bullets: string[];
}> = [
  {
    tier: "tier_1",
    label: "Наблюдатель",
    price: "10 EUR",
    accent: "border-cyan-300/25 bg-cyan-300/8",
    summary: "Базовый вход в закрытый мир.",
    bullets: ["ранний доступ", "закулисье", "спойлеры и обсуждения"]
  },
  {
    tier: "tier_2",
    label: "Приближённый",
    price: "25 EUR",
    accent: "border-accent/30 bg-accent/10",
    summary: "Больше процесса и ближе к созданию.",
    bullets: ["всё из tier 1", "больше backstage", "голос за идеи"]
  },
  {
    tier: "tier_3",
    label: "VIP",
    price: "50 EUR",
    accent: "border-amber-300/30 bg-amber-300/10",
    summary: "Максимальный уровень и личное внимание.",
    bullets: ["всё из tier 2", "личные пожелания", "эксклюзив вне ленты"]
  }
];

export default async function TelegramSupportPage({
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
    <MiniAppShell profile={profile} title={accessOpen ? "Поддержать" : "Доступ"}>
      {accessOpen ? (
        <section className="rounded-[28px] border border-accent/25 bg-accent/10 p-5 shadow-glow">
          <p className="text-xs uppercase tracking-[0.24em] text-accentSoft">Скоро появится</p>
          <h2 className="mt-3 text-xl font-semibold text-white">Поддержка внутри Mini App</h2>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Здесь скоро появится раздел для донатов и продления уровня прямо внутри Telegram.
          </p>
        </section>
      ) : (
        <>
          {sent ? (
            <section className="rounded-[28px] border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100 shadow-glow">
              Заявка отправлена. После подтверждения доступ появится в этом Mini App.
            </section>
          ) : null}

          {error ? (
            <section className="rounded-[28px] border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100 shadow-glow">
              Не удалось отправить заявку. Попробуй ещё раз.
            </section>
          ) : null}

          <section className="grid gap-3">
            {tierCards.map((card) => (
              <article
                key={card.tier}
                className={`rounded-[28px] border p-4 shadow-glow ${card.accent}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">{card.label}</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">{card.price}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/72">{card.summary}</p>
                  </div>
                  <form action={createTelegramPurchaseRequestAction}>
                    <input type="hidden" name="tier" value={card.tier} />
                    <button className="rounded-2xl border border-white/15 bg-black/20 px-4 py-2 text-sm font-medium text-white transition hover:border-accent/40 hover:bg-white/10">
                      Выбрать
                    </button>
                  </form>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {card.bullets.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-glow">
            <p className="text-xs uppercase tracking-[0.24em] text-accentSoft">Как это работает</p>
            <div className="mt-3 grid gap-2 text-sm text-white/68">
              <p>1. Нажимаешь `Выбрать` на нужном уровне.</p>
              <p>2. Я вижу заявку в админке и подтверждаю вход.</p>
              <p>3. После подтверждения здесь откроется лента клуба.</p>
            </div>
          </section>
        </>
      )}
    </MiniAppShell>
  );
}
