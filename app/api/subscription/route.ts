import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getSubscriptionForUser, subscriptionHasAccess, tierNumberToName } from "@/lib/data/subscriptions";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const subscription = await getSubscriptionForUser(profile.id, profile);
  const hasAccess = profile.role === "admin" || subscriptionHasAccess(subscription);
  const currentTier = profile.role === "admin" ? 4 : hasAccess ? subscription?.tier ?? 0 : 0;
  return NextResponse.json({ subscription, current_tier: currentTier, current_tier_name: tierNumberToName(currentTier) ?? "guest", has_access: hasAccess }, { headers: { "cache-control": "no-store" } });
}
