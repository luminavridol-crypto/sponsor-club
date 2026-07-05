import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, Tier } from "@/lib/types";

export const CHAT_MESSAGE_PACK_SIZE = 20;
export const CHAT_MESSAGE_PACK_PRICE_EUR = 5;

export const CHAT_MESSAGE_MONTHLY_LIMITS: Record<Tier, number | null> = {
  tier_1: 20,
  tier_2: 50,
  tier_3: 100,
  tier_4: null
};

function getMonthWindow(now = new Date()) {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return {
    monthStart: monthStart.toISOString(),
    nextMonthStart: nextMonthStart.toISOString()
  };
}

export function getChatMessageGrantExpiry(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

export async function getChatMessageUsage(
  admin: SupabaseClient,
  profile: Pick<Profile, "id" | "tier">
) {
  const baseLimit = CHAT_MESSAGE_MONTHLY_LIMITS[profile.tier];
  const { monthStart, nextMonthStart } = getMonthWindow();

  const [{ count }, { data: grants }] = await Promise.all([
    admin
      .from("member_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .eq("sender_role", "member")
      .eq("counts_against_monthly_limit", true)
      .gte("created_at", monthStart)
      .lt("created_at", nextMonthStart),
    admin
      .from("member_chat_message_grants")
      .select("message_count")
      .eq("profile_id", profile.id)
      .gt("expires_at", new Date().toISOString())
  ]);

  const purchased = (grants ?? []).reduce((sum, grant) => sum + Number(grant.message_count || 0), 0);
  const totalLimit = baseLimit === null ? null : baseLimit + purchased;
  const used = count ?? 0;
  const remaining = totalLimit === null ? null : Math.max(totalLimit - used, 0);

  return {
    baseLimit,
    purchased,
    totalLimit,
    used,
    remaining,
    isUnlimited: totalLimit === null
  };
}

export async function canSendMonthlyChatMessage(
  admin: SupabaseClient,
  profile: Pick<Profile, "id" | "tier">
) {
  const usage = await getChatMessageUsage(admin, profile);
  return usage.isUnlimited || (usage.remaining ?? 0) > 0;
}

export async function resetMonthlyChatUsageForProfile(admin: SupabaseClient, profileId: string) {
  const { monthStart, nextMonthStart } = getMonthWindow();

  await admin
    .from("member_chat_messages")
    .update({ counts_against_monthly_limit: false })
    .eq("profile_id", profileId)
    .eq("sender_role", "member")
    .eq("counts_against_monthly_limit", true)
    .gte("created_at", monthStart)
    .lt("created_at", nextMonthStart);
}
