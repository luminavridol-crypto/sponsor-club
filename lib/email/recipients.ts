import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Tier } from "@/lib/types";
import { canAccessTier } from "@/lib/utils/tier";
import { EmailRecipient } from "./service";

export type ManualEmailAudience = "all_active" | "tier_1" | "tier_2" | "tier_3" | "expiring_soon";

type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  nickname: string | null;
  tier: Tier;
  access_expires_at: string | null;
};

function mapProfileRecipient(profile: ProfileRow): EmailRecipient {
  return {
    profileId: profile.id,
    email: profile.email,
    displayName: profile.display_name || profile.nickname || profile.email,
    tier: profile.tier,
    accessExpiresAt: profile.access_expires_at
  };
}

export async function getPostEmailRecipients(requiredTier: Tier) {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, display_name, nickname, tier, access_expires_at")
    .eq("role", "member")
    .eq("access_status", "active")
    .order("created_at", { ascending: false });

  return ((data ?? []) as ProfileRow[])
    .filter((profile) => Boolean(profile.email) && canAccessTier(profile.tier, requiredTier))
    .map(mapProfileRecipient);
}

export async function getManualEmailRecipients(audience: ManualEmailAudience) {
  const admin = createAdminSupabaseClient();
  const now = new Date();

  let query = admin
    .from("profiles")
    .select("id, email, display_name, nickname, tier, access_expires_at")
    .eq("role", "member")
    .eq("access_status", "active");

  if (audience === "tier_1" || audience === "tier_2" || audience === "tier_3") {
    query = query.eq("tier", audience);
  }

  if (audience === "expiring_soon") {
    const cutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query
      .not("access_expires_at", "is", null)
      .gt("access_expires_at", now.toISOString())
      .lte("access_expires_at", cutoff);
  }

  const { data } = await query.order("created_at", { ascending: false });

  return ((data ?? []) as ProfileRow[])
    .filter((profile) => Boolean(profile.email))
    .map((profile) => ({
      ...mapProfileRecipient(profile),
      daysLeft: profile.access_expires_at
        ? Math.max(1, Math.ceil((new Date(profile.access_expires_at).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
        : null
    }));
}
