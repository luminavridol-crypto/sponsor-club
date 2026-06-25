export const dynamic = "force-dynamic";

import { TierAccordionList } from "@/components/tiers/tier-accordion-list";
import { getTierLandingCards } from "@/lib/data/tier-landing";
import { buildTelegramMiniAppLink } from "@/lib/telegram/links";

export default async function GuestTiersPage() {
  const tierCards = await getTierLandingCards();
  const openMiniAppLink = buildTelegramMiniAppLink("club");

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#17151d_0%,#111119_42%,#0c0d13_100%)] px-3 py-6 text-white sm:px-4 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(34,31,44,0.96),rgba(24,22,32,0.94))] px-5 py-5 shadow-[0_12px_28px_rgba(0,0,0,0.16)] backdrop-blur-md">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">Lumina Club</p>
          <h1 className="mt-3 font-display text-[2rem] font-semibold leading-none text-white sm:text-[2.4rem]">
            Тарифы и цены
          </h1>
          <p className="mt-4 max-w-[42rem] text-sm leading-6 text-white/72 sm:text-[0.96rem]">
            Открытая страница для гостей. Здесь можно посмотреть все уровни доступа, описание и стоимость подписок без входа в клуб.
          </p>
          {openMiniAppLink ? (
            <a
              href={openMiniAppLink}
              className="mt-5 inline-flex rounded-[18px] border border-white/14 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-white/[0.1]"
            >
              Открыть в Telegram
            </a>
          ) : null}
        </section>

        <TierAccordionList cards={tierCards} showPaymentButton={false} />
      </div>
    </main>
  );
}
