import Link from "next/link";
import { updatePasswordAction } from "@/app/actions";
import { BrandShell } from "@/components/layout/brand-shell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : "";
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <BrandShell>
        <section className="mx-auto flex min-h-[calc(100vh-88px)] max-w-md items-center px-4 py-12 sm:px-6">
          <div className="w-full rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
            <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">
              Password Recovery
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white">
              Сначала откройте ссылку из письма
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Для смены пароля нужно перейти по ссылке из письма восстановления. После
              этого откроется форма для нового пароля.
            </p>
            <div className="mt-6">
              <Link
                href="/forgot-password"
                className="inline-flex rounded-2xl bg-white px-4 py-3 font-medium text-background transition hover:bg-goldSoft"
              >
                Запросить письмо ещё раз
              </Link>
            </div>
          </div>
        </section>
      </BrandShell>
    );
  }

  return (
    <BrandShell>
      <section className="mx-auto flex min-h-[calc(100vh-88px)] max-w-md items-center px-4 py-12 sm:px-6">
        <div className="w-full rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">
            Password Recovery
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Новый пароль</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Придумайте новый пароль для входа в ваш аккаунт.
          </p>

          {error === "match" ? (
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              Пароли не совпадают. Введите одинаковый пароль в оба поля.
            </div>
          ) : null}

          {error === "1" ? (
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              Не удалось обновить пароль. Попробуйте открыть ссылку из письма ещё раз.
            </div>
          ) : null}

          <form action={updatePasswordAction} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-white/60">Новый пароль</label>
              <input
                name="password"
                type="password"
                placeholder="Минимум 8 символов"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/60">
                Повторите пароль
              </label>
              <input
                name="confirmPassword"
                type="password"
                placeholder="Повторите пароль"
                required
              />
            </div>
            <button className="w-full rounded-2xl bg-white px-4 py-3 font-medium text-background transition hover:bg-goldSoft">
              Сохранить новый пароль
            </button>
          </form>
        </div>
      </section>
    </BrandShell>
  );
}
