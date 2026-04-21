import { Tier } from "@/lib/types";

export const TIERS: Tier[] = ["tier_1", "tier_2", "tier_3"];

export const TIER_LABELS: Record<Tier, string> = {
  tier_1: "Наблюдатель",
  tier_2: "Приближённый",
  tier_3: "VIP"
};

export const TIER_ACCESS_HINTS: Record<Tier, string> = {
  tier_1: "Этот пост увидят Наблюдатель, Приближённый и VIP",
  tier_2: "Этот пост увидят Приближённый и VIP. Наблюдатель не увидит",
  tier_3: "Этот пост увидит только VIP. При этом VIP-подписчик видит также все посты других уровней"
};

export function canAccessTier(userTier: Tier, requiredTier: Tier) {
  return TIERS.indexOf(userTier) >= TIERS.indexOf(requiredTier);
}

export function buildInviteLink(code: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${siteUrl}/invite?code=${code}`;
}
