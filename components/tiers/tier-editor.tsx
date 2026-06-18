import { updateTierLandingAction } from "@/app/actions";
import {
  ADMIN_BUTTON_PRIMARY_CLASS,
  ADMIN_INPUT_CLASS,
  ADMIN_PANEL_CLASS,
  ADMIN_PANEL_GLOW_CLASS,
  ADMIN_SECTION_TITLE_CLASS,
  ADMIN_SUBPANEL_CLASS,
  ADMIN_TEXTAREA_CLASS
} from "@/components/admin/theme";
import type { TierAccordionCard } from "@/components/tiers/tier-accordion-list";

function parseSectionsText(card: TierAccordionCard) {
  return JSON.stringify(card.sections, null, 2);
}

export function TierEditor({ cards }: { cards: TierAccordionCard[] }) {
  return (
    <section className={ADMIN_PANEL_CLASS}>
      <div className={ADMIN_PANEL_GLOW_CLASS} />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Admin</p>
            <h2 className={ADMIN_SECTION_TITLE_CLASS}>Редактирование тарифов</h2>
            <p className="mt-2 max-w-[44rem] text-sm leading-6 text-white/62">
              Меняй только тексты и цену. Визуальный стиль карточек остаётся фиксированным, чтобы
              страница выглядела как сейчас.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {cards.map((card) => (
            <details key={card.id} className={`${ADMIN_SUBPANEL_CLASS} overflow-hidden`} open={card.tier === "tier_4"}>
              <summary className="cursor-pointer list-none">
                <div className={`rounded-[18px] border px-4 py-3 ${card.accentClass}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/42">{card.badge}</p>
                      <h3 className="mt-1 font-display text-[1.15rem] text-white">{card.label}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">Цена</p>
                      <p className="font-display text-[1.1rem] text-white">{card.price}</p>
                    </div>
                  </div>
                </div>
              </summary>

              <form action={updateTierLandingAction} className="mt-4 space-y-4">
                <input type="hidden" name="tier" value={card.tier} />

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-white/45">Название</label>
                    <input name="label" defaultValue={card.label} className={ADMIN_INPUT_CLASS} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-white/45">Уровень</label>
                    <input name="level" defaultValue={card.level} className={ADMIN_INPUT_CLASS} />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-white/45">Описание</label>
                    <textarea
                      name="teaser"
                      rows={4}
                      defaultValue={card.teaser}
                      className={ADMIN_TEXTAREA_CLASS}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.18em] text-white/45">Цена</label>
                      <input name="price" defaultValue={card.price} className={ADMIN_INPUT_CLASS} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.18em] text-white/45">Бейдж</label>
                      <input name="statusBadge" defaultValue={card.statusBadge ?? ""} className={ADMIN_INPUT_CLASS} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.18em] text-white/45">Подпись</label>
                      <input name="noteBadge" defaultValue={card.noteBadge ?? ""} className={ADMIN_INPUT_CLASS} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-white/45">Дополнительный текст</label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={card.description ?? ""}
                    className={ADMIN_TEXTAREA_CLASS}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-white/45">Секции JSON</label>
                  <textarea
                    name="sectionsJson"
                    rows={14}
                    defaultValue={parseSectionsText(card)}
                    className={`${ADMIN_TEXTAREA_CLASS} font-mono text-[12px] leading-5`}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-[38rem] text-xs leading-5 text-white/42">
                    Меняются только копирайт и блоки. Карта, градиенты, размеры и остальной стиль не трогаются.
                  </p>
                  <button className={ADMIN_BUTTON_PRIMARY_CLASS}>Сохранить тариф</button>
                </div>
              </form>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
