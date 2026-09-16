"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LinkEmailAccountForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setMessage(null);
    try {
      const data = new FormData(form);
      const response = await fetch("/api/account/link-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(payload.error || "Не удалось связать аккаунты.");
        return;
      }
      form.reset();
      setMessage("Аккаунты связаны. Подписка теперь общая для сайта и Telegram.");
      router.refresh();
    } catch {
      setMessage("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <label className="text-sm text-white/65">Email сайта<input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50" /></label>
      <label className="text-sm text-white/65">Пароль сайта<input name="password" type="password" required minLength={8} autoComplete="current-password" className="mt-1 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50" /></label>
      <button type="submit" disabled={pending} className="rounded-2xl border border-accent/35 bg-accent/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/20 disabled:opacity-50">{pending ? "Связываю…" : "Связать с Telegram"}</button>
      {message ? <p className="text-sm leading-6 text-white/65" role="status">{message}</p> : null}
    </form>
  );
}
