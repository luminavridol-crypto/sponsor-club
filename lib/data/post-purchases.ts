import { unstable_noStore as noStore } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Profile } from "@/lib/types";

type PurchaseAccessProfile = Pick<Profile, "id" | "email">;

export async function getApprovedPurchasedPostIds(profile: PurchaseAccessProfile) {
  noStore();

  if (!profile.id && !profile.email) {
    return [];
  }

  const admin = createAdminSupabaseClient();
  const baseQuery = () =>
    admin
      .from("purchase_requests")
      .select("requested_post_id")
      .eq("approved_for_post", true)
      .not("requested_post_id", "is", null);
  const [{ data: profileRequests }, { data: legacyEmailRequests }] = await Promise.all([
    profile.id ? baseQuery().eq("requester_profile_id", profile.id) : Promise.resolve({ data: [] }),
    profile.email ? baseQuery().is("requester_profile_id", null).eq("email", profile.email) : Promise.resolve({ data: [] })
  ]);

  return [
    ...new Set(
      [...(profileRequests ?? []), ...(legacyEmailRequests ?? [])]
        .map((item) => String(item.requested_post_id))
        .filter(Boolean)
    )
  ];
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
