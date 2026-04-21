import { createInviteAction, disableInviteAction } from "@/app/actions";
import { PrivateShell } from "@/components/layout/private-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
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

export default async function AdminInvitesPage() {
  const profile = await requireAdmin();
  await cleanupInvites();

  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("invites").select("*").order("created_at", { ascending: false });
  const invites = (data ?? []) as Invite[];

  return (
    <PrivateShell profile={profile} admin>
      <div className="space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-cyanGlow">Invite Control</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Приглашения и access codes</h2>
          <p className="mt-3 text-sm text-white/60">
            По умолчанию каждое приглашение живёт 24 часа. Потом оно автоматически исчезает.
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
              <input name="note" placeholder="Например: Instagram sponsor" />
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
      </div>
    </PrivateShell>
  );
}
