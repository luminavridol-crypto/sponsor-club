import type { Route } from "next";
import Link from "next/link";
import { BrandShell } from "@/components/layout/brand-shell";
import { loginAction } from "@/app/actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : "";
  const disabled = params.disabled === "1";
  const passwordUpdated = params.passwordUpdated === "1";
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/dashboard";
  const loginHref = `/login?next=${encodeURIComponent(next)}` as Route;

  return (
    <BrandShell>
      <section className="mx-auto flex min-h-[calc(100vh-88px)] max-w-md items-center px-4 py-12 sm:px-6">
        <div className="w-full rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">Войти</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Я уже зарегистрирована</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Войдите по email и паролю. После входа система направит вас в кабинет или в закрытый клуб.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={loginHref}
              className="rounded-2xl border border-white/10 bg-white px-4 py-2 text-sm text-background transition"
            >
              Вход
            </Link>
          </div>

          {passwordUpdated ? (
            <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              Пароль обновлён. Теперь можно войти с новым паролем.
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              Неверный email или пароль.
            </div>
          ) : null}

          {disabled ? (
            <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Доступ к аккаунту отключён администратором.
            </div>
          ) : null}

          <form action={loginAction} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={next} />
            <div>
              <label className="mb-2 block text-sm text-white/60">Email</label>
              <input name="email" type="email" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/60">Пароль</label>
              <input
                name="password"
                type="password"
                placeholder="Минимум 8 символов"
                required
              />
            </div>
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-accentSoft transition hover:text-white"
              >
                Забыли пароль?
              </Link>
            </div>
            <button className="w-full rounded-2xl bg-white px-4 py-3 font-medium text-background transition hover:bg-goldSoft">
              Войти
            </button>
          </form>

          <p className="mt-5 text-sm text-white/55">
            Нет аккаунта для закрытого клуба?{" "}
            <Link href="/invite" className="text-accentSoft">
              Активируйте приглашение
            </Link>
          </p>
        </div>
      </section>
    </BrandShell>
  );
}
