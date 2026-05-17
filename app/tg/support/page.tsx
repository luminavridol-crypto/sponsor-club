export const dynamic = "force-dynamic";

import { createDonationClaimAction } from "@/app/actions";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { requireAnyProfile } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupportDetails } from "@/lib/telegram/env";
import { DonationClaim } from "@/lib/types";

export default async function TelegramSupportPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireAnyProfile();
  const admin = createAdminSupabaseClient();
  const params = (await searchParams) ?? {};
  const sent = (Array.isArray(params.sent) ? params.sent[0] : params.sent) === "1";
  const error = (Array.isArray(params.error) ? params.error[0] : params.error) === "1";
  const support = getSupportDetails();

  const { data } = await admin
    .from("donation_claims")
    .select("*")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  const claims = (data ?? []) as DonationClaim[];

  return (
    <MiniAppShell
      profile={profile}
      title="Поддержать"
      subtitle="Оплата остаётся внешней и подтверждается вручную."
    >
      <section className="rounded-[28px] border border-accent/25 bg-accent/10 p-5 shadow-glow">
        <p className="text-xs uppercase tracking-[0.24em] text-accentSoft">Реквизиты</p>
        <p className="mt-3 text-sm text-white/65">{support.cardLabel}</p>
        <p className="mt-1 break-all text-xl font-semibold text-white">{support.cardNumber || "Добавь номер карты в .env"}</p>
        <p className="mt-3 text-sm leading-6 text-white/70">{support.note}</p>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-accentSoft">Я отправила донат</p>
        {sent ? (
          <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            Заявка отправлена. Я проверю перевод и выдам доступ вручную.
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            Не получилось сохранить заявку. Проверь поля и попробуй ещё раз.
          </div>
        ) : null}

        <form action={createDonationClaimAction} className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-white/60">Уровень</span>
            <select
              name="tier"
              defaultValue="tier_1"
              className="w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-white outline-none"
            >
              <option value="tier_1">Наблюдатель</option>
              <option value="tier_2">Приближённый</option>
              <option value="tier_3">VIP</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-white/60">Сумма</span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="amount"
              placeholder="Например 25"
              className="w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-white outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-white/60">Комментарий</span>
            <textarea
              name="note"
              required
              maxLength={1000}
              placeholder="Когда отправила, с какой карты, что нужно открыть"
              className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-white outline-none"
            />
          </label>

          <button className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-background">
            Отправить заявку
          </button>
        </form>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-accentSoft">Мои заявки</p>
        <div className="mt-4 space-y-3">
          {claims.length ? (
            claims.map((claim) => (
              <div key={claim.id} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{claim.suggested_tier}</p>
                  <span className="text-xs uppercase tracking-[0.18em] text-white/45">{claim.status}</span>
                </div>
                {claim.amount ? <p className="mt-2 text-sm text-white/75">{claim.amount.toFixed(2)} EUR</p> : null}
                {claim.note ? <p className="mt-2 text-sm leading-6 text-white/60">{claim.note}</p> : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-white/55">Заявок пока нет.</p>
          )}
        </div>
      </section>
    </MiniAppShell>
  );
}
