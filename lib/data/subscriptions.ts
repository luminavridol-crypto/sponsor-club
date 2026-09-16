import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { AccessStatus, Profile, Tier } from "@/lib/types";

export type SubscriptionStatus = "active" | "expired" | "pending" | "cancelled";
export type SubscriptionTier = 0 | 1 | 2 | 3 | 4;

export type Subscription = {
  id: string | null;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  started_at: string | null;
  expires_at: string | null;
  payment_source: string | null;
  auto_renew: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export function tierNameToNumber(tier: Tier | null | undefined): SubscriptionTier {
  if (tier === "tier_4") return 4;
  if (tier === "tier_3") return 3;
  if (tier === "tier_2") return 2;
  if (tier === "tier_1") return 1;
  return 0;
}
export function tierNumberToName(tier: number): Tier | null {
  if (tier === 4) return "tier_4";
  if (tier === 3) return "tier_3";
  if (tier === 2) return "tier_2";
  if (tier === 1) return "tier_1";
  return null;
}

function isExpired(expiresAt: string | null | undefined) {
  return Boolean(expiresAt && new Date(expiresAt) <= new Date());
}

export function subscriptionHasAccess(subscription: Subscription | null | undefined) {
  return Boolean(
    subscription &&
      subscription.tier > 0 &&
      subscription.status === "active" &&
      !isExpired(subscription.expires_at)
  );
}

function legacySubscription(profile: Pick<Profile, "id" | "tier" | "access_status" | "access_expires_at" | "created_at">): Subscription {
  const expired = isExpired(profile.access_expires_at);
  return {
    id: null,
    user_id: profile.id,
    tier: tierNameToNumber(profile.tier),
    status: profile.access_status === "active" && !expired ? "active" : expired ? "expired" : "cancelled",
    started_at: profile.created_at,
    expires_at: profile.access_expires_at,
    payment_source: "legacy_profile",
    auto_renew: false,
    created_at: profile.created_at,
    updated_at: null
  };
}

export async function getSubscriptionForUser(
  userId: string,
  fallbackProfile?: Pick<Profile, "id" | "tier" | "access_status" | "access_expires_at" | "created_at"> | null,
  client: SupabaseClient = createAdminSupabaseClient()
): Promise<Subscription | null> {
  const { data, error } = await client.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();

  if (!error && data) return data as Subscription;
  if (fallbackProfile) return legacySubscription(fallbackProfile);
  return null;
}

export async function applySubscriptionToProfile(profile: Profile, client?: SupabaseClient): Promise<Profile> {
  if (profile.role === "admin") return { ...profile, tier: "tier_4", access_status: "active" };
  const subscription = await getSubscriptionForUser(profile.id, profile, client);
  if (!subscription) return profile;
  const tier = tierNumberToName(subscription.tier);
  return {
    ...profile,
    tier: tier ?? profile.tier,
    access_status: subscriptionHasAccess(subscription) ? "active" : "disabled",
    access_expires_at: subscription.expires_at
  };
}

export async function setUserSubscription({
  userId,
  tier,
  accessStatus,
  expiresAt,
  paymentSource = "admin",
  client = createAdminSupabaseClient()
}: {
  userId: string;
  tier: Tier;
  accessStatus: AccessStatus;
  expiresAt?: string | null;
  paymentSource?: string | null;
  client?: SupabaseClient;
}) {
  const numericTier = tierNameToNumber(tier);
  const expired = isExpired(expiresAt);
  const status: SubscriptionStatus = accessStatus === "active" && !expired ? "active" : expired ? "expired" : "cancelled";
  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    tier: numericTier,
    status,
    started_at: status === "active" ? now : null,
    expires_at: expiresAt ?? null,
    payment_source: paymentSource,
    auto_renew: false
  };
  const subscriptionResult = await client.from("subscriptions").upsert(payload, { onConflict: "user_id" });

  // Deployment remains safe before migration 032 is applied.
  if (subscriptionResult.error && !subscriptionResult.error.message.toLowerCase().includes("subscriptions")) {
    throw new Error(subscriptionResult.error.message);
  }

  const profileResult = await client
    .from("profiles")
    .update({ tier, access_status: accessStatus, access_expires_at: expiresAt ?? null })
    .eq("id", userId);
  if (profileResult.error) throw new Error(profileResult.error.message);
}
