export const dynamic = "force-dynamic";

import { approveDonationClaimAction, updateDonationClaimStatusAction } from "@/app/actions";
import {
  ADMIN_BADGE_CLASS,
  ADMIN_BUTTON_DANGER_CLASS,
  ADMIN_BUTTON_PRIMARY_CLASS,
  ADMIN_BUTTON_SECONDARY_CLASS,
  ADMIN_EYEBROW_CLASS,
  ADMIN_HEADER_CLASS,
  ADMIN_PANEL_CLASS,
  ADMIN_PANEL_GLOW_CLASS,
  ADMIN_SECTION_TITLE_CLASS,
  ADMIN_SELECT_CLASS,
  ADMIN_SHELL_CLASS,
  ADMIN_SUBPANEL_CLASS,
  getAdminTierTheme
} from "@/components/admin/theme";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { DonationClaim, Profile } from "@/lib/types";

type ClaimWithProfile = DonationClaim & {
  profiles: Pick<Profile, "display_name" | "email" | "telegram_username"> | null;
};

export default async function TelegramAdminDonationsPage() {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("donation_claims")
    .select("*, profiles(display_name, email, telegram_username)")
    .order("created_at", { ascending: false });

  const claims = (data ?? []) as ClaimWithProfile[];

  return (
    <MiniAppShell
      profile={profile}
      title="Донаты"
      shellClassName={ADMIN_SHELL_CLASS}
      headerClassName={ADMIN_HEADER_CLASS}
      eyebrowClassName={ADMIN_EYEBROW_CLASS}
    >
      <section className={ADMIN_PANEL_CLASS}>
        <div className={ADMIN_PANEL_GLOW_CLASS} />
        <div className="relative">
          <p className={ADMIN_BADGE_CLASS}>Donation Desk</p>
          <h2 className={`mt-3 ${ADMIN_SECTION_TITLE_CLASS}`}>Заявки на донаты</h2>
          <p className="mt-2 text-sm leading-6 text-white/62">
            Здесь можно быстро проверить заявку, назначить уровень и сразу открыть участнику нужный доступ.
          </p>
        </div>
      </section>

      {claims.length ? (
        claims.map((claim) => {
          const tierTheme = getAdminTierTheme(claim.suggested_tier);

          return (
            <section key={claim.id} className={`${ADMIN_SUBPANEL_CLASS} ${tierTheme.card}`}>
              <div className={`pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full blur-3xl ${tierTheme.glow}`} />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className={ADMIN_BADGE_CLASS}>{claim.status}</span>
                      <span className={`${ADMIN_BADGE_CLASS} ${tierTheme.pill}`}>{claim.suggested_tier}</span>
                    </div>
                    <h2 className="font-display mt-3 text-[1.35rem] font-semibold text-white">
                      {claim.profiles?.display_name || claim.profiles?.telegram_username || claim.profiles?.email || "Участник"}
                    </h2>
                    {claim.amount ? <p className="mt-2 text-sm text-white/75">{claim.amount.toFixed(2)} EUR</p> : null}
                  </div>
                  <p className="text-xs text-white/42">{new Date(claim.created_at).toLocaleString("ru-RU")}</p>
                </div>

                {claim.note ? <p className="mt-4 text-sm leading-6 text-white/65">{claim.note}</p> : null}

                <div className="mt-4 grid gap-3">
                  <form action={updateDonationClaimStatusAction}>
                    <input type="hidden" name="claimId" value={claim.id} />
                    <input type="hidden" name="status" value="in_review" />
                    <button className={ADMIN_BUTTON_SECONDARY_CLASS}>В работу</button>
                  </form>

                  <form action={approveDonationClaimAction} className="grid gap-3 sm:grid-cols-[1.1fr_0.8fr_auto]">
                    <input type="hidden" name="claimId" value={claim.id} />
                    <select name="tier" defaultValue={claim.suggested_tier} className={ADMIN_SELECT_CLASS}>
                      <option value="tier_1">Наблюдатель</option>
                      <option value="tier_2">Приближённый</option>
                      <option value="tier_3">VIP</option>
                      <option value="tier_4">After Dark</option>
                    </select>
                    <input
                      type="number"
                      name="accessDays"
                      min="1"
                      defaultValue="30"
                      className={ADMIN_SELECT_CLASS}
                    />
                    <button className={ADMIN_BUTTON_PRIMARY_CLASS}>Подтвердить</button>
                  </form>

                  <form action={updateDonationClaimStatusAction}>
                    <input type="hidden" name="claimId" value={claim.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <button className={`w-full ${ADMIN_BUTTON_DANGER_CLASS}`}>Отклонить</button>
                  </form>
                </div>
              </div>
            </section>
          );
        })
      ) : (
        <section className={`${ADMIN_SUBPANEL_CLASS} text-sm text-white/60`}>Заявок на донат пока нет.</section>
      )}
    </MiniAppShell>
  );
}
