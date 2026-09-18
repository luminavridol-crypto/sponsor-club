export const dynamic = "force-dynamic";

import { TierAccordionList } from "@/components/tiers/tier-accordion-list";
import { getTierLandingCards } from "@/lib/data/tier-landing";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { getI18n } from "@/lib/i18n/server";
import { localizeTierCards } from "@/lib/i18n/tier-content";

export default async function GuestTiersPage() {
  const baseTierCards = await getTierLandingCards();
  const { locale, messages } = await getI18n();
  const tierCards = localizeTierCards(baseTierCards, locale);
  const copy = messages.subscription;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#17151d_0%,#111119_42%,#0c0d13_100%)] px-3 py-6 text-white sm:px-4 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(34,31,44,0.96),rgba(24,22,32,0.94))] px-5 py-5 shadow-[0_12px_28px_rgba(0,0,0,0.16)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-3"><p className="text-[11px] uppercase tracking-[0.24em] text-white/50">Lumina Club</p><LanguageSwitcher locale={locale} label={messages.language.label} options={[{ value: "ru", label: "RU" }, { value: "en", label: "EN" }, { value: "vi", label: "VI" }]} /></div>
          <h1 className="mt-3 font-display text-[2rem] font-semibold leading-none text-white sm:text-[2.4rem]">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-[42rem] text-sm leading-6 text-white/72 sm:text-[0.96rem]">
            {copy.description}
          </p>
        </section>

        <TierAccordionList
          cards={tierCards}
          paymentButtonLabel={messages.request.submit}
          paymentHrefBase="/request-access"
        />
      </div>
    </main>
  );
}
