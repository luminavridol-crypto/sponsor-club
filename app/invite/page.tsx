import { redirect } from "next/navigation";
import type { Route } from "next";
import { BrandShell } from "@/components/layout/brand-shell";
import { InviteRegistrationForm } from "@/components/account/invite-registration-form";
import { getCurrentWebsiteProfile } from "@/lib/auth/current-profile";
import { getI18n } from "@/lib/i18n/server";

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ code?: string; error?: string }> }) {
  if (await getCurrentWebsiteProfile()) redirect("/account" as Route);
  const params = await searchParams;
  const { messages } = await getI18n();
  const code = params.code?.trim().toUpperCase() ?? "";
  const copy = messages.invite;
  return <BrandShell><section className="mx-auto flex min-h-[calc(100vh-84px)] max-w-6xl items-center justify-center px-4 py-12 sm:px-6"><div className="w-full max-w-md rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,79,216,0.12),transparent_35%),rgba(12,9,22,0.88)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)] sm:p-8"><p className="text-xs uppercase tracking-[0.3em] text-accentSoft">{copy.eyebrow}</p><h1 className="font-display mt-3 text-3xl text-white">{copy.title}</h1><p className="mt-3 text-sm leading-6 text-white/60">{copy.description}</p><InviteRegistrationForm code={code} error={params.error} copy={copy} /></div></section></BrandShell>;
}
