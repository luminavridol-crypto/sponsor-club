import "server-only";
import type { Profile, Tier } from "@/lib/types";
import { getSubscriptionForUser, tierNumberToName } from "@/lib/data/subscriptions";
import { sendAccessRequestAdminNotification } from "@/lib/email/access-request-notification";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { TIER_LABELS } from "@/lib/utils/tier";

export type AccessRequestSource = "website" | "telegram";
export type AccessRequestType = "new_access" | "renewal" | "upgrade";
export type CreateAccessRequestResult =
  | { status: "created"; id: string; requestType: AccessRequestType }
  | { status: "already_pending"; id: string; requestType: AccessRequestType };

const VALID_TIERS = new Set<Tier>(["tier_1", "tier_2", "tier_3", "tier_4"]);

function requestTypeFor(currentTier: number, hasAccess: boolean, requestedTier: number): AccessRequestType {
  if (!hasAccess || currentTier === 0) return "new_access";
  if (requestedTier > currentTier) return "upgrade";
  return "renewal";
}

export async function createAccessRequest({
  profile,
  requestedTier,
  source,
  comment
}: {
  profile: Profile;
  requestedTier: Tier;
  source: AccessRequestSource;
  comment?: string | null;
}): Promise<CreateAccessRequestResult> {
  if (!VALID_TIERS.has(requestedTier)) throw new Error("INVALID_TIER");

  const cleanComment = comment?.trim().slice(0, 1000) || null;
  const admin = createAdminSupabaseClient();
  const subscription = await getSubscriptionForUser(profile.id, profile, admin);
  const currentTierNumber = subscription?.tier ?? 0;
  const requestedTierNumber = Number(requestedTier.slice(-1));
  const hasAccess = Boolean(subscription?.status === "active" && (!subscription.expires_at || new Date(subscription.expires_at) > new Date()));
  const requestType = requestTypeFor(currentTierNumber, hasAccess, requestedTierNumber);

  const { data: pending } = await admin
    .from("purchase_requests")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("tier", requestedTier)
    .eq("request_type", requestType)
    .eq("request_kind", "tier")
    .in("status", ["new", "in_progress"])
    .limit(1)
    .maybeSingle();

  if (pending) return { status: "already_pending", id: pending.id, requestType };

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("purchase_requests")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .eq("request_kind", "tier")
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= 5) throw new Error("RATE_LIMITED");

  const currentTier = tierNumberToName(currentTierNumber);
  const displayName = profile.display_name || profile.telegram_first_name || profile.telegram_username || profile.email;
  const contact = source === "telegram"
    ? `Telegram: ${profile.telegram_username ? `@${profile.telegram_username.replace(/^@/, "")}` : "connected"}`
    : `Website account: ${profile.email}`;
  const { data: created, error } = await admin
    .from("purchase_requests")
    .insert({
      profile_id: profile.id,
      tier: requestedTier,
      current_tier: currentTier,
      source,
      request_type: requestType,
      request_kind: "tier",
      display_name: displayName,
      email: profile.email,
      country: source === "telegram" ? "Telegram Mini App" : "Website",
      contact,
      comment: cleanComment,
      status: "new"
    })
    .select("id, created_at")
    .single();

  if (error || !created) {
    if (error?.code === "23505") {
      const { data: existing } = await admin
        .from("purchase_requests")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("tier", requestedTier)
        .eq("request_type", requestType)
        .in("status", ["new", "in_progress"])
        .limit(1)
        .single();
      if (existing) return { status: "already_pending", id: existing.id, requestType };
    }
    throw new Error(error?.message || "REQUEST_INSERT_FAILED");
  }

  try {
    await sendAccessRequestAdminNotification({
      id: created.id,
      createdAt: created.created_at,
      displayName,
      email: profile.email,
      telegramUsername: profile.telegram_username,
      source,
      requestType,
      currentTier,
      requestedTier,
      comment: cleanComment
    });
  } catch (notificationError) {
    console.error("Access request admin email failed", {
      requestId: created.id,
      message: notificationError instanceof Error ? notificationError.message : "Unknown email error"
    });
  }

  console.info("Access request created", { requestId: created.id, source, requestType, tier: TIER_LABELS[requestedTier] });
  return { status: "created", id: created.id, requestType };
}
