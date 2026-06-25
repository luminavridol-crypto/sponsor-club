export const dynamic = "force-dynamic";

import {
  deleteTelegramSupportMethodAction,
  saveTelegramSupportMethodAction
} from "@/app/actions";
import {
  ADMIN_BUTTON_DANGER_CLASS,
  ADMIN_BUTTON_PRIMARY_CLASS,
  ADMIN_BUTTON_SECONDARY_CLASS,
  ADMIN_EYEBROW_CLASS,
  ADMIN_HEADER_CLASS,
  ADMIN_INPUT_CLASS,
  ADMIN_PANEL_CLASS,
  ADMIN_PANEL_GLOW_CLASS,
  ADMIN_SUBPANEL_CLASS,
  ADMIN_SECTION_TITLE_CLASS,
  ADMIN_SHELL_CLASS,
  ADMIN_TEXTAREA_CLASS
} from "@/components/admin/theme";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { ScrollToTopOnParams } from "@/components/telegram/scroll-to-top-on-params";
import { requireAdmin } from "@/lib/auth/guards";
import { getTelegramSupportSettings } from "@/lib/data/telegram-support";

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14" strokeLinecap="round" />
      <path d="M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export default async function TelegramAdminSupportPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireAdmin();
  const params = (await searchParams) ?? {};
  const saved = readParam(params.saved) === "1";
  const errorMessage = readParam(params.error);
  const hasError = Boolean(errorMessage);
  const settings = await getTelegramSupportSettings();

  return (
    <MiniAppShell
      profile={profile}
      title="Реквизиты"
      shellClassName={ADMIN_SHELL_CLASS}
      headerClassName={ADMIN_HEADER_CLASS}
      eyebrowClassName={ADMIN_EYEBROW_CLASS}
    >
      <div id="top" />
      <ScrollToTopOnParams active={saved || hasError} />

      {saved ? (
        <section className="rounded-[28px] border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-100 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
          Сохранено.
        </section>
      ) : null}

      {hasError ? (
        <section className="rounded-[28px] border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
          {errorMessage}
        </section>
      ) : null}

      <section className={ADMIN_PANEL_CLASS}>
        <div className={ADMIN_PANEL_GLOW_CLASS} />
        <div className="relative space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={ADMIN_SECTION_TITLE_CLASS}>Способы оплаты</h2>
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/65">
              {settings.methods.length} шт.
            </div>
          </div>

          <div className="space-y-3">
            {settings.methods.map((method) => (
              <article key={method.id} className={ADMIN_SUBPANEL_CLASS}>
                <form action={saveTelegramSupportMethodAction} className="space-y-4">
                  <input type="hidden" name="methodId" value={method.id} />
                  <div className="grid gap-3 md:grid-cols-[1.1fr_1.6fr_120px]">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.18em] text-white/45">Название</label>
                      <input name="label" defaultValue={method.label} required minLength={2} className={ADMIN_INPUT_CLASS} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.18em] text-white/45">Реквизиты / ссылка / текст</label>
                      <input name="value" defaultValue={method.value} required className={ADMIN_INPUT_CLASS} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.18em] text-white/45">Порядок</label>
                      <input name="sortOrder" type="number" min="0" defaultValue={method.sortOrder} className={ADMIN_INPUT_CLASS} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-white/45">Подсказка</label>
                    <textarea
                      name="note"
                      rows={2}
                      defaultValue={method.note}
                      className={`${ADMIN_TEXTAREA_CLASS} min-h-[72px] py-2.5`}
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button className={ADMIN_BUTTON_PRIMARY_CLASS}>Сохранить</button>
                    <button
                      formAction={deleteTelegramSupportMethodAction}
                      name="methodId"
                      value={method.id}
                      className={ADMIN_BUTTON_DANGER_CLASS}
                    >
                      Удалить
                    </button>
                  </div>
                </form>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={ADMIN_PANEL_CLASS}>
        <div className={ADMIN_PANEL_GLOW_CLASS} />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] text-white">
              <PlusIcon />
            </span>
            <h2 className={ADMIN_SECTION_TITLE_CLASS}>Добавить способ</h2>
          </div>

          <form action={saveTelegramSupportMethodAction} className="mt-5 space-y-3">
            <div className="grid gap-3 md:grid-cols-[1.1fr_1.6fr_120px]">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.18em] text-white/45">Название</label>
                <input name="label" placeholder="Карта" required minLength={2} className={ADMIN_INPUT_CLASS} />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.18em] text-white/45">Реквизиты / ссылка / текст</label>
                <input name="value" required className={ADMIN_INPUT_CLASS} />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.18em] text-white/45">Порядок</label>
                <input name="sortOrder" type="number" min="0" defaultValue={settings.methods.length} className={ADMIN_INPUT_CLASS} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-white/45">Подсказка</label>
              <textarea name="note" rows={2} className={`${ADMIN_TEXTAREA_CLASS} min-h-[72px] py-2.5`} />
            </div>

            <div className="flex flex-wrap gap-3">
              <button className={ADMIN_BUTTON_PRIMARY_CLASS}>Добавить способ</button>
              <span className={ADMIN_BUTTON_SECONDARY_CLASS}>Плюс для новых реквизитов</span>
            </div>
          </form>
        </div>
      </section>
    </MiniAppShell>
  );
}
