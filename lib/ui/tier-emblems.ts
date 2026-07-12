import { Tier } from "@/lib/types";

export const TIER_EMBLEMS: Record<Tier, string> = {
  tier_1: "/assets/tiers/satellite-moon.png",
  tier_2: "/assets/tiers/insider-key.png",
  tier_3: "/assets/tiers/vip-crown.png",
  tier_4: "/assets/tiers/after-dark-rose.png"
};

export const TIER_BY_BADGE: Record<string, Tier> = {
  "tier 01": "tier_1",
  "tier 02": "tier_2",
  "tier 03": "tier_3",
  "tier 04": "tier_4"
};
