import { redirect } from "next/navigation";
import type { Route } from "next";
import { AccountOverview } from "@/components/account/account-overview";
import { BrandShell } from "@/components/layout/brand-shell";
import { WebsiteAccountNav } from "@/components/layout/website-account-nav";
import { getCurrentWebsiteProfile } from "@/lib/auth/current-profile";
import { getSubscriptionForUser } from "@/lib/data/subscriptions";
import { buildTelegramMiniAppLink } from "@/lib/telegram/links";
import { getI18n } from "@/lib/i18n/server";

export default async function AccountPage() {
  const profile = await getCurrentWebsiteProfile();
  if (!profile) redirect("/login?next=/account" as Route);
  const subscription = await getSubscriptionForUser(profile.id, profile);
  const { locale, messages } = await getI18n();
  const telegramLink = buildTelegramMiniAppLink("link-account") ?? "/tg/link-account";
  return <BrandShell rightSlot={<WebsiteAccountNav profile={profile} subscription={subscription} />}><section className="mx-auto min-h-[calc(100vh-84px)] max-w-6xl px-4 py-10 sm:px-6 sm:py-14"><AccountOverview telegramLink={telegramLink} locale={locale} copy={messages.account} common={messages.common} /></section></BrandShell>;
}
