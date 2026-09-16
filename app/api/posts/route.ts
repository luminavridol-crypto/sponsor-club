import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getApprovedPurchasedPostIds } from "@/lib/data/post-purchases";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasClubAccess } from "@/lib/auth/access";
import { canAccessTier } from "@/lib/utils/tier";
import type { FeedPost } from "@/lib/types";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("posts")
    .select("id, slug, title, description, post_type, required_tier, is_sellable, sale_price, publish_at, thumbnail_path, expires_at")
    .eq("status", "published")
    .lte("publish_at", new Date().toISOString())
    .order("publish_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load posts" }, { status: 500 });
  const purchased = new Set(await getApprovedPurchasedPostIds(profile));
  const now = new Date();
  const posts = ((data ?? []) as Array<FeedPost & { expires_at?: string | null }>).filter((post) => !post.expires_at || new Date(post.expires_at) > now).map((post) => {
    const accessible = profile.role === "admin" || purchased.has(post.id) || (hasClubAccess(profile) && canAccessTier(profile.tier, post.required_tier));
    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      description: post.description,
      post_type: post.post_type,
      required_tier: post.required_tier,
      publish_at: post.publish_at,
      is_sellable: post.is_sellable,
      sale_price: post.sale_price,
      is_locked: !accessible
    };
  });
  return NextResponse.json({ posts }, { headers: { "cache-control": "no-store" } });
}
