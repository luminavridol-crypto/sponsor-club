import { redeemInviteAction } from "@/app/actions";
import { BrandShell } from "@/components/layout/brand-shell";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

async function getInviteStatus(code: string) {
  if (!code) {
    return { state: "empty" as const };
  }

  const admin = createAdminSupabaseClient();
  const { data: invite } = await admin
    .from("invites")
    .select("used_at, disabled_at, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (!invite) {
    return { state: "invalid" as const };
  }

  if (invite.disabled_at || invite.used_at) {
    return { state: "used" as const };
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { state: "expired" as const };
  }

  return { state: "active" as const };
}

export default async function InvitePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const inviteCode = typeof params.code === "string" ? params.code.toUpperCase() : "";
  const error = typeof params.error === "string" ? params.error : "";
  const inviteStatus = await getInviteStatus(inviteCode);

  const statusError =
    inviteStatus.state === "used"
      ? "Это приглашение уже использовано или отключено"
      : inviteStatus.state === "expired"
        ? "Срок действия приглашения истёк"
        : inviteStatus.state === "invalid" && inviteCode
          ? "Приглашение не найдено"
          : "";

  const pageError = error || statusError;
  const canRedeem = inviteStatus.state === "active" || inviteStatus.state === "empty";

  return (
    <BrandShell>
      <section className="mx-auto flex min-h-[calc(100vh-88px)] max-w-xl items-center px-4 py-12 sm:px-6">
        <div className="w-full rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-cyanGlow">Invite Only</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Создание аккаунта по приглашению</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Введите invite-код или откройте страницу по ссылке-приглашению. Свободная регистрация
            отключена.
          </p>

          {pageError ? (
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {decodeURIComponent(pageError)}
            </div>
          ) : null}

          {canRedeem ? (
            <form action={redeemInviteAction} className="mt-6 grid gap-4">
              <div>
                <label className="mb-2 block text-sm text-white/60">Invite code</label>
                <input
                  name="code"
                  defaultValue={inviteCode}
                  placeholder="Введите код приглашения"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/60">Email</label>
                <input name="email" type="email" placeholder="you@example.com" required />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/60">Пароль</label>
                <input name="password" type="password" placeholder="Минимум 8 символов" required />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/60">Отображаемое имя</label>
                <input name="displayName" placeholder="Как показывать вас в профиле" />
              </div>
              <button className="rounded-2xl bg-white px-4 py-3 font-medium text-background transition hover:bg-goldSoft">
                Активировать приглашение
              </button>
            </form>
          ) : (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/70">
              Для регистрации нужен новый, ещё не использованный invite-код.
            </div>
          )}
        </div>
      </section>
    </BrandShell>
  );
}
