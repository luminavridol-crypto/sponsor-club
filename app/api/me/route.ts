import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getSubscriptionForUser, subscriptionHasAccess, tierNumberToName } from "@/lib/data/subscriptions";
import { getSignedAvatarUrls } from "@/lib/data/profiles";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const subscription = await getSubscriptionForUser(profile.id, profile);
  const tier = profile.role === "admin" ? 4 : subscriptionHasAccess(subscription) ? subscription?.tier ?? 0 : 0;
  const avatarUrls = profile.avatar_url ? await getSignedAvatarUrls([profile.avatar_url]) : {};
  return NextResponse.json({
    user: {
      id: profile.id,
      email: profile.email,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url ? avatarUrls[profile.avatar_url] ?? profile.telegram_photo_url ?? null : profile.telegram_photo_url ?? null,
      telegram_id: profile.telegram_id,
      telegram_username: profile.telegram_username
    },
    subscription,
    tier,
    tier_name: tierNumberToName(tier) ?? "guest",
    expires_at: subscription?.expires_at ?? null
  }, { headers: { "cache-control": "no-store" } });
}
