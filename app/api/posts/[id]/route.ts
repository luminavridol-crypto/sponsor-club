import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { hasClubAccess } from "@/lib/auth/access";
import { getApprovedPurchasedPostIds } from "@/lib/data/post-purchases";
import { getSignedMediaUrls } from "@/lib/data/posts";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { PostWithMedia } from "@/lib/types";
import { canAccessTier } from "@/lib/utils/tier";
import { tierNameToNumber } from "@/lib/data/subscriptions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("posts").select("*, post_media(*)").eq("id", id).maybeSingle();
  const post = data as PostWithMedia | null;
  if (!post || post.status !== "published" || new Date(post.publish_at) > new Date() || (post.expires_at && new Date(post.expires_at) <= new Date())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const purchased = (await getApprovedPurchasedPostIds(profile)).includes(post.id);
  const allowed = profile.role === "admin" || purchased || (hasClubAccess(profile) && canAccessTier(profile.tier, post.required_tier));
  if (!allowed) {
    return NextResponse.json({
      error: "Forbidden",
      required_tier: post.required_tier,
      required_tier_level: tierNameToNumber(post.required_tier),
      current_tier: hasClubAccess(profile) ? tierNameToNumber(profile.tier) : 0,
      current_tier_name: hasClubAccess(profile) ? profile.tier : "guest",
      upgrade_required: true
    }, { status: 403, headers: { "cache-control": "no-store" } });
  }
  const paths = [...post.post_media.map((media) => media.storage_path), ...(post.thumbnail_path ? [post.thumbnail_path] : [])];
  const urls = await getSignedMediaUrls(paths);
  return NextResponse.json({
    post: {
      id: post.id,
      slug: post.slug,
      title: post.title,
      description: post.description,
      body: post.body,
      post_type: post.post_type,
      required_tier: post.required_tier,
      publish_at: post.publish_at,
      thumbnail_url: post.thumbnail_path ? urls[post.thumbnail_path] ?? null : null,
      media: post.post_media.map((media) => ({ id: media.id, type: media.media_type, sort_order: media.sort_order, url: urls[media.storage_path] ?? null }))
    }
  }, { headers: { "cache-control": "private, no-store" } });
}
