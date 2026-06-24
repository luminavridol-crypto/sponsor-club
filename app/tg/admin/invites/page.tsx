export const dynamic = "force-dynamic";

import { createInviteAction, deleteInviteAction, disableInviteAction } from "@/app/actions";
import {
  ADMIN_BADGE_CLASS,
  ADMIN_BUTTON_PRIMARY_CLASS,
  ADMIN_BUTTON_SECONDARY_CLASS,
  ADMIN_EYEBROW_CLASS,
  ADMIN_HEADER_CLASS,
  ADMIN_INPUT_CLASS,
  ADMIN_PANEL_CLASS,
  ADMIN_PANEL_GLOW_CLASS,
  ADMIN_SECTION_TITLE_CLASS,
  ADMIN_SELECT_CLASS,
  ADMIN_SHELL_CLASS,
  ADMIN_SUBPANEL_CLASS
} from "@/components/admin/theme";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildTelegramInviteLink } from "@/lib/telegram/links";
import { Invite } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { buildInviteLink, TIER_LABELS } from "@/lib/utils/tier";

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

async function cleanupInvites() {
  const admin = createAdminSupabaseClient();
  const now = new Date();
  const dayAgoIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  await admin
    .from("invites")
    .delete()
    .or(
      [
        `expires_at.lt.${nowIso}`,
        `and(used_at.not.is.null,used_at.lt.${dayAgoIso})`,
        `and(disabled_at.not.is.null,disabled_at.lt.${dayAgoIso})`
      ].join(",")
    );
}

export default async function TelegramAdminInvitesPage() {
  const profile = await requireAdmin();
  await cleanupInvites();

  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("invites").select("*").order("created_at", { ascending: false });
  const invites = (data ?? []) as Invite[];

  return (
    <MiniAppShell
      profile={profile}
      title="Приглашения"
      shellClassName={ADMIN_SHELL_CLASS}
      headerClassName={ADMIN_HEADER_CLASS}
      eyebrowClassName={ADMIN_EYEBROW_CLASS}
    >
      <section className={ADMIN_PANEL_CLASS}>
        <div className={ADMIN_PANEL_GLOW_CLASS} />
        <div className="relative">
          <h2 className={ADMIN_SECTION_TITLE_CLASS}>Invite-коды</h2>
        </div>

        <form action={createInviteAction} className="relative mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-white/60">Email получателя</label>
            <input name="email" type="email" placeholder="Можно оставить пустым" className={ADMIN_INPUT_CLASS} />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/60">Уровень доступа</label>
            <select name="assignedTier" defaultValue="tier_1" className={ADMIN_SELECT_CLASS}>
              <option value="tier_1">{TIER_LABELS.tier_1}</option>
              <option value="tier_2">{TIER_LABELS.tier_2}</option>
              <option value="tier_3">{TIER_LABELS.tier_3}</option>
              <option value="tier_4">{TIER_LABELS.tier_4}</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/60">Истекает</label>
            <input name="expiresAt" type="datetime-local" className={ADMIN_INPUT_CLASS} />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/60">Заметка</label>
            <input name="note" placeholder="Например: sponsor from Telegram" className={ADMIN_INPUT_CLASS} />
          </div>

          <div className="md:col-span-2">
            <button className={ADMIN_BUTTON_PRIMARY_CLASS}>Создать приглашение</button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        {invites.length ? (
          invites.map((invite) => (
            <article key={invite.id} className={ADMIN_SUBPANEL_CLASS}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className={ADMIN_BADGE_CLASS}>{TIER_LABELS[invite.assigned_tier]}</span>
                    <span className={ADMIN_BADGE_CLASS}>
                      {invite.used_at ? "Использован" : invite.disabled_at ? "Отключён" : "Активен"}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-[1.35rem] font-semibold text-white">{invite.code}</h3>
                  <p className="mt-2 text-sm text-white/55">
                    {invite.email || "Без привязки к email"} • создано {formatDate(invite.created_at)}
                  </p>
                  <p className="mt-3 break-all text-sm text-fuchsia-100/82">
                    {buildTelegramInviteLink(invite.code) || "Добавь TELEGRAM_BOT_USERNAME, чтобы отправлять Telegram invite."}
                  </p>
                  <p className="mt-2 break-all text-sm text-white/68">{buildInviteLink(invite.code)}</p>
                  <p className="mt-3 text-sm text-white/45">
                    Истекает: {invite.expires_at ? formatDate(invite.expires_at) : "через 24 часа по умолчанию"}
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    {invite.used_at ? `Использован: ${formatDate(invite.used_at)}` : "Ещё не использован"}
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <form action={disableInviteAction}>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <button className={ADMIN_BUTTON_SECONDARY_CLASS}>Отключить invite</button>
                  </form>
                  <form action={deleteInviteAction}>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <button
                      type="submit"
                      aria-label="Удалить invite"
                      title="Удалить invite"
                      className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-[18px] border border-rose-200/14 bg-rose-500/8 text-rose-100 transition hover:bg-rose-500/12"
                    >
                      <TrashIcon />
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className={`${ADMIN_SUBPANEL_CLASS} text-sm text-white/60`}>Активных приглашений сейчас нет.</div>
        )}
      </section>
    </MiniAppShell>
  );
}
