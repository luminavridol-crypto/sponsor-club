export const dynamic = "force-dynamic";

import { approveDonationClaimAction, updateDonationClaimStatusAction } from "@/app/actions";
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
    <MiniAppShell profile={profile} title="Донаты" subtitle="Ручное подтверждение переводов без Telegram Payments.">
      {claims.length ? (
        claims.map((claim) => (
          <section key={claim.id} className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-glow">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-accentSoft">{claim.status}</p>
                <h2 className="mt-2 text-lg font-semibold text-white">
                  {claim.profiles?.display_name || claim.profiles?.telegram_username || claim.profiles?.email || "Участник"}
                </h2>
                {claim.amount ? <p className="mt-2 text-sm text-white/75">{claim.amount.toFixed(2)} EUR</p> : null}
              </div>
              <p className="text-xs text-white/40">{new Date(claim.created_at).toLocaleString("ru-RU")}</p>
            </div>

            {claim.note ? <p className="mt-4 text-sm leading-6 text-white/65">{claim.note}</p> : null}

            <div className="mt-4 grid gap-3">
              <form action={updateDonationClaimStatusAction} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="claimId" value={claim.id} />
                <input type="hidden" name="status" value="in_review" />
                <button className="rounded-2xl border border-cyanGlow/30 bg-cyanGlow/10 px-4 py-3 text-sm text-cyanGlow">
                  В работу
                </button>
              </form>

              <form action={approveDonationClaimAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="claimId" value={claim.id} />
                <select
                  name="tier"
                  defaultValue={claim.suggested_tier}
                  className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-white outline-none"
                >
                  <option value="tier_1">Наблюдатель</option>
                  <option value="tier_2">Приближённый</option>
                  <option value="tier_3">VIP</option>
                </select>
                <input
                  type="number"
                  name="accessDays"
                  min="1"
                  defaultValue="30"
                  className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-white outline-none"
                />
                <button className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-background">
                  Подтвердить
                </button>
              </form>

              <form action={updateDonationClaimStatusAction}>
                <input type="hidden" name="claimId" value={claim.id} />
                <input type="hidden" name="status" value="rejected" />
                <button className="w-full rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                  Отклонить
                </button>
              </form>
            </div>
          </section>
        ))
      ) : (
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-sm text-white/60">
          Заявок на донат пока нет.
        </section>
      )}
    </MiniAppShell>
  );
}
