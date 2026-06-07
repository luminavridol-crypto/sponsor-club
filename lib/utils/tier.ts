import { Tier } from "@/lib/types";

export const TIERS: Tier[] = ["tier_1", "tier_2", "tier_3", "tier_4"];

export const TIER_LABELS: Record<Tier, string> = {
  tier_1: "Наблюдатель",
  tier_2: "Приближённый",
  tier_3: "VIP",
  tier_4: "After Dark"
};

export const TIER_ACCESS_HINTS: Record<Tier, string> = {
  tier_1: "Этот пост увидят Наблюдатель, Приближённый, VIP и After Dark.",
  tier_2: "Этот пост увидят Приближённый, VIP и After Dark. Наблюдатель его не увидит.",
  tier_3: "Этот пост увидят VIP и After Dark. Они также видят посты всех уровней ниже.",
  tier_4: "Этот пост увидит только After Dark. Это самый высокий уровень доступа."
};

export function canAccessTier(userTier: Tier, requiredTier: Tier) {
  return TIERS.indexOf(userTier) >= TIERS.indexOf(requiredTier);
}

export function buildInviteLink(code: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${siteUrl}/invite?code=${code}`;
}
