import { unstable_noStore as noStore } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Profile } from "@/lib/types";

type PurchaseAccessProfile = Pick<Profile, "email">;

export async function getApprovedPurchasedPostIds(profile: PurchaseAccessProfile) {
  noStore();

  if (!profile.email) {
    return [];
  }

  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("purchase_requests")
    .select("requested_post_id")
    .eq("email", profile.email)
    .eq("approved_for_post", true)
    .not("requested_post_id", "is", null);

  return [...new Set((data ?? []).map((item) => String(item.requested_post_id)).filter(Boolean))];
}

export async function hasApprovedPurchasedPosts(profile: PurchaseAccessProfile) {
  const postIds = await getApprovedPurchasedPostIds(profile);
  return postIds.length > 0;
}

export async function hasApprovedPurchasedPostAccess(profile: PurchaseAccessProfile, postId: string) {
  if (!postId) {
    return false;
  }

  const postIds = await getApprovedPurchasedPostIds(profile);
  return postIds.includes(postId);
}
