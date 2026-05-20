export const dynamic = "force-dynamic";

import { createInviteAction, disableInviteAction } from "@/app/actions";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildTelegramInviteLink, buildTelegramMiniAppLink } from "@/lib/telegram/links";
import { Invite } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { buildInviteLink, TIER_LABELS } from "@/lib/utils/tier";

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
  const telegramMiniAppLink = buildTelegramMiniAppLink();
  const { data } = await admin.from("invites").select("*").order("created_at", { ascending: false });
  const invites = (data ?? []) as Invite[];

  return (
    <MiniAppShell
      profile={profile}
      title="Приглашение"
      subtitle="Ссылка для Telegram Mini App и обычные invite-коды для доступа."
    >
      <section className="rounded-[28px] border border-accent/20 bg-accent/10 p-5 shadow-glow">
        <p className="text-xs uppercase tracking-[0.24em] text-accentSoft">Telegram Mini App</p>
        <h2 className="mt-3 text-xl font-semibold text-white">Ссылка для входа через Telegram</h2>
        <p className="mt-3 text-sm leading-6 text-white/70">
          Отправь человеку эту ссылку. Он откроет бота и авторизуется через Telegram.
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
          <p className="break-all text-sm text-white">
            {telegramMiniAppLink || "Добавь TELEGRAM_BOT_USERNAME в Vercel, чтобы здесь появилась Telegram-ссылка."}
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-glow">
        <p className="text-sm uppercase tracking-[0.28em] text-cyanGlow">Invite Control</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Invite-коды</h2>
        <p className="mt-3 text-sm text-white/60">
          Если нужен отдельный код, создай его здесь. Он пригодится для web-входа или ручного доступа.
        </p>

        <form action={createInviteAction} className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-white/60">Email получателя</label>
            <input name="email" type="email" placeholder="Можно оставить пустым" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/60">Уровень доступа</label>
            <select name="assignedTier" defaultValue="tier_1">
              <option value="tier_1">{TIER_LABELS.tier_1}</option>
              <option value="tier_2">{TIER_LABELS.tier_2}</option>
              <option value="tier_3">{TIER_LABELS.tier_3}</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/60">Истекает</label>
            <input name="expiresAt" type="datetime-local" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/60">Заметка</label>
            <input name="note" placeholder="Например: Telegram sponsor" />
          </div>

          <div className="md:col-span-2">
            <button className="rounded-2xl bg-white px-4 py-3 font-medium text-background transition hover:bg-goldSoft">
              Создать приглашение
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        {invites.length ? (
          invites.map((invite) => (
            <article key={invite.id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{invite.code}</p>
                  <p className="mt-2 text-sm text-white/55">
                    {invite.email || "Без привязки к email"} • {TIER_LABELS[invite.assigned_tier]} • создано{" "}
                    {formatDate(invite.created_at)}
                  </p>
                  <p className="mt-2 break-all text-sm text-accentSoft">
                    {buildTelegramInviteLink(invite.code) || "Добавь TELEGRAM_BOT_USERNAME, чтобы отправлять Telegram invite."}
                  </p>
                  <p className="mt-2 break-all text-sm text-accentSoft">{buildInviteLink(invite.code)}</p>
                  <p className="mt-2 text-sm text-white/45">
                    Истекает: {invite.expires_at ? formatDate(invite.expires_at) : "через 24 часа по умолчанию"}
                  </p>
                  <p className="mt-2 text-sm text-white/45">
                    {invite.used_at ? `Использован: ${formatDate(invite.used_at)}` : "Ещё не использован"}
                  </p>
                </div>

                <form action={disableInviteAction}>
                  <input type="hidden" name="inviteId" value={invite.id} />
                  <button className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/85 transition hover:border-accent/35 hover:bg-white/5">
                    Отключить invite
                  </button>
                </form>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-white/60">
            Активных приглашений сейчас нет.
          </div>
        )}
      </section>
    </MiniAppShell>
  );
}
