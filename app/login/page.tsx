import { redirect } from "next/navigation";
import type { Route } from "next";
import { websiteLoginAction } from "@/app/actions";
import { BrandShell } from "@/components/layout/brand-shell";
import { getCurrentWebsiteProfile } from "@/lib/auth/current-profile";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  if (await getCurrentWebsiteProfile()) redirect("/account" as Route);
  const params = await searchParams;
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/account";
  return (
    <BrandShell>
      <section className="mx-auto flex min-h-[calc(100vh-84px)] max-w-6xl items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,79,216,0.12),transparent_35%),rgba(12,9,22,0.88)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)] sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-accentSoft">Lumina Club</p>
          <h1 className="font-display mt-3 text-3xl text-white">Вход в личный кабинет</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">Используйте email и пароль зарегистрированного аккаунта.</p>
          {params.error ? <p role="alert" className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{params.error === "credentials" ? "Неверный email или пароль." : "Проверьте заполненные поля."}</p> : null}
          <form action={websiteLoginAction} className="mt-6 grid gap-4">
            <input type="hidden" name="next" value={next} />
            <label className="text-sm text-white/65">Email<input name="email" type="email" required autoComplete="email" className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition focus:border-accent/50" /></label>
            <label className="text-sm text-white/65">Пароль<input name="password" type="password" minLength={8} required autoComplete="current-password" className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition focus:border-accent/50" /></label>
            <button type="submit" className="rounded-2xl border border-accent/40 bg-gradient-to-r from-accent/75 to-[#7040f4] px-4 py-3 font-semibold text-white shadow-[0_16px_38px_rgba(255,79,216,0.22)] transition hover:brightness-110">Войти</button>
          </form>
          <p className="mt-5 text-center text-xs leading-5 text-white/42">Регистрация новых участников выполняется через приглашение или Telegram Mini App.</p>
        </div>
      </section>
    </BrandShell>
  );
}
