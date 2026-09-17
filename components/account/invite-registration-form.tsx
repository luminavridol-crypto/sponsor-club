"use client";

import { FormEvent, useState } from "react";
import { useFormStatus } from "react-dom";
import { redeemInviteAction } from "@/app/actions";
import type { Messages } from "@/lib/i18n/messages";

function SubmitButton({ copy }: { copy: Messages["invite"] }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="rounded-2xl border border-accent/40 bg-gradient-to-r from-accent/75 to-[#7040f4] px-4 py-3 font-semibold text-white shadow-[0_16px_38px_rgba(255,79,216,0.22)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-55">{pending ? copy.submitting : copy.submit}</button>;
}

export function InviteRegistrationForm({ code, error, copy }: { code: string; error?: string; copy: Messages["invite"] }) {
  const [clientError, setClientError] = useState<string | null>(null);

  function validate(event: FormEvent<HTMLFormElement>) {
    setClientError(null);
    const data = new FormData(event.currentTarget);
    if (String(data.get("password") ?? "") !== String(data.get("confirmPassword") ?? "")) {
      event.preventDefault();
      setClientError(copy.errors.password_mismatch);
    }
  }

  const fieldClass = "mt-1.5 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-accent/50";
  const message = clientError ?? (error ? copy.errors[error as keyof typeof copy.errors] ?? copy.errors.generic : null);

  return <form action={redeemInviteAction} onSubmit={validate} className="mt-6 grid gap-4">
    {message ? <p role="alert" className="rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{message}</p> : null}
    <label className="text-sm text-white/65">{copy.name}<input name="displayName" required minLength={1} maxLength={80} autoComplete="name" className={fieldClass} /></label>
    <label className="text-sm text-white/65">{copy.email}<input name="email" type="email" required autoComplete="email" className={fieldClass} /></label>
    <label className="text-sm text-white/65">{copy.password}<input name="password" type="password" required minLength={8} autoComplete="new-password" className={fieldClass} /></label>
    <label className="text-sm text-white/65">{copy.confirmPassword}<input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className={fieldClass} /></label>
    {code ? <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-white/38">{copy.code}</p><p className="mt-1 font-medium text-white/80">{code}</p><input type="hidden" name="code" value={code} /></div> : <label className="text-sm text-white/65">{copy.code}<input name="code" required minLength={4} autoComplete="one-time-code" autoCapitalize="characters" className={fieldClass} /></label>}
    <SubmitButton copy={copy} />
  </form>;
}
