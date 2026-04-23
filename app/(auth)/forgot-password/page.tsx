import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions";
import { BrandShell } from "@/components/layout/brand-shell";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const sent = params.sent === "1";
  const hasError = params.error === "1";

  return (
    <BrandShell>
      <section className="mx-auto flex min-h-[calc(100vh-88px)] max-w-md items-center px-4 py-12 sm:px-6">
        <div className="w-full rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">
            Password Recovery
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            Восстановление пароля
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Введите e-mail от вашего аккаунта. Мы отправим письмо со ссылкой, где
            можно задать новый пароль.
          </p>

          {sent ? (
            <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              Письмо отправлено. Проверьте почту и откройте ссылку для смены пароля.
            </div>
          ) : null}

          {hasError ? (
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              Не удалось отправить письмо. Проверьте e-mail и попробуйте ещё раз.
            </div>
          ) : null}

          <form action={requestPasswordResetAction} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-white/60">Email</label>
              <input name="email" type="email" placeholder="you@example.com" required />
            </div>
            <button className="w-full rounded-2xl bg-white px-4 py-3 font-medium text-background transition hover:bg-goldSoft">
              Отправить письмо
            </button>
          </form>

          <p className="mt-5 text-sm text-white/55">
            <Link href="/login" className="text-accentSoft">
              Вернуться ко входу
            </Link>
          </p>
        </div>
      </section>
    </BrandShell>
  );
}
