export const dynamic = "force-dynamic";

import { TierAccordionList } from "@/components/tiers/tier-accordion-list";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { hasClubAccess } from "@/lib/auth/access";
import { requireAnyProfile } from "@/lib/auth/guards";
import { hasApprovedPurchasedPosts } from "@/lib/data/post-purchases";
import { getTierLandingCards } from "@/lib/data/tier-landing";

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseTier(value: string | string[] | undefined) {
  const normalized = readParam(value);

  if (normalized === "tier_1" || normalized === "tier_2" || normalized === "tier_3" || normalized === "tier_4") {
    return normalized;
  }

  return undefined;
}

export default async function TelegramTiersPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireAnyProfile();
  const params = (await searchParams) ?? {};
  const accessOpen = hasClubAccess(profile);
  const saved = readParam(params.saved) === "1";
  const error = readParam(params.error);
  const savedTier = readParam(params.tier);
  const openTier = parseTier(params.openTier);
  const postSlug = readParam(params.postSlug);
  const postTitle = readParam(params.postTitle);
  const postPrice = readParam(params.postPrice);
  const hasContentAccess = hasClubAccess(profile) || (await hasApprovedPurchasedPosts(profile));
  const tierCards = await getTierLandingCards();
  const savedLabel = tierCards.find((card) => card.tier === savedTier)?.label;

  return (
    <MiniAppShell profile={profile} title="Добро пожаловать в закрытый клуб" hasAccess={hasContentAccess}>
      {saved ? (
        <section className="rounded-[28px] border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-100 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
          {savedLabel ? `Тариф «${savedLabel}» сохранён.` : "Тариф сохранён."}
        </section>
      ) : null}

      {error ? (
        <section className="rounded-[28px] border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
          {error === "schema"
            ? "Не удалось сохранить тариф: в Supabase ещё не создана таблица tier_landing_content. Нужно применить миграцию 026."
            : error === "json"
              ? "Не удалось сохранить тариф: в блоке секций сломан JSON."
              : error === "fields"
                ? "Не удалось сохранить тариф: проверь, что название, уровень, цена, описание и секции заполнены."
            : "Не удалось сохранить тариф. Проверь поля и JSON в секциях."}
        </section>
      ) : null}

      {!accessOpen ? (
        <section className="rounded-[28px] border border-white/12 bg-white/[0.04] px-5 py-5 text-white shadow-[0_18px_46px_rgba(0,0,0,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">Welcome</p>
          <p className="mt-3 max-w-[34rem] text-sm leading-6 text-white/72 sm:text-[0.96rem]">
            Выбери уровень доступа ниже. После подтверждения здесь откроются лента, профиль и весь закрытый контент клуба.
          </p>
        </section>
      ) : null}

      <TierAccordionList
        cards={tierCards}
        isAdmin={profile.role === "admin"}
        initialOpenTier={openTier}
        paymentContext={
          postSlug || postTitle || postPrice
            ? {
                postSlug: postSlug ?? undefined,
                postTitle: postTitle ?? undefined,
                postPrice: postPrice ?? undefined
              }
            : undefined
        }
      />
    </MiniAppShell>
  );
}
