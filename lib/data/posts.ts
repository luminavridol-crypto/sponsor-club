import { unstable_noStore as noStore } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PostWithMedia, Tier } from "@/lib/types";
import { canAccessTier } from "@/lib/utils/tier";

export async function getVisiblePostsForTier(tier: Tier) {
  noStore();
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("posts")
    .select("*, post_media(*)")
    .eq("status", "published")
    .lte("publish_at", new Date().toISOString())
    .order("publish_at", { ascending: false });

  const posts = (data ?? []) as PostWithMedia[];
  return posts.filter((post) => {
    if (post.expires_at && new Date(post.expires_at) <= new Date()) {
      return false;
    }

    return canAccessTier(tier, post.required_tier);
  });
}

export async function getPostBySlugForTier(slug: string, tier: Tier) {
  noStore();
  const admin = createAdminSupabaseClient();
  const normalizedSlug = decodeURIComponent(slug);
  const { data } = await admin
    .from("posts")
    .select("*, post_media(*)")
    .eq("slug", normalizedSlug)
    .single();

  const post = data as PostWithMedia | null;
  if (!post) return null;
  if (post.status !== "published") return null;
  if (new Date(post.publish_at) > new Date()) return null;
  if (post.expires_at && new Date(post.expires_at) <= new Date()) return null;
  if (!canAccessTier(tier, post.required_tier)) return null;
  return post;
}

export async function getSignedMediaUrls(paths: string[]) {
  noStore();
  const admin = createAdminSupabaseClient();

  if (!paths.length) return {};

  const { data } = await admin.storage.from("post-media").createSignedUrls(
    paths,
    60 * 60
  );

  return Object.fromEntries(
    (data ?? []).map((item) => [item.path, item.signedUrl ?? ""])
  );
}
