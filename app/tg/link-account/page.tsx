import { LinkEmailAccountForm } from "@/components/telegram/link-email-account-form";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { requireAnyProfile } from "@/lib/auth/guards";

export default async function LinkAccountPage() {
  const profile = await requireAnyProfile();
  return (
    <MiniAppShell profile={profile} title="Единый аккаунт" hasAccess={false}>
      <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-accentSoft">Website + Telegram</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Связать существующий аккаунт</h2>
        <p className="mt-3 text-sm leading-6 text-white/65">Введите данные существующего аккаунта сайта. Пароль проверяется через Supabase Auth и не сохраняется. Telegram ID, уже принадлежащий другому аккаунту, нельзя перепривязать незаметно.</p>
        <div className="mt-5"><LinkEmailAccountForm /></div>
      </section>
    </MiniAppShell>
  );
}
