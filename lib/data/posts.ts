import { unstable_noStore as noStore } from "next/cache";
import { getMediaUrl, isR2StoragePath } from "@/lib/storage/media";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { FeedPost, PostWithMedia, Tier } from "@/lib/types";
import { canAccessTier } from "@/lib/utils/tier";

async function getPublishedPosts() {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("posts")
    .select("*, post_media(*)")
    .eq("status", "published")
    .lte("publish_at", new Date().toISOString())
    .order("publish_at", { ascending: false });

  const posts = (data ?? []) as PostWithMedia[];
  return posts.filter((post) => !(post.expires_at && new Date(post.expires_at) <= new Date()));
}

async function getPublishedFeedPosts() {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("posts")
    .select("id, slug, title, description, post_type, required_tier, publish_at, expires_at, thumbnail_path, post_media(id)")
    .eq("status", "published")
    .lte("publish_at", new Date().toISOString())
    .order("publish_at", { ascending: false });

  const posts = (data ?? []) as Array<FeedPost & { expires_at?: string | null }>;
  return posts.filter((post) => !(post.expires_at && new Date(post.expires_at) <= new Date()));
}

export async function getVisiblePostsForTier(tier: Tier) {
  noStore();
  const posts = await getPublishedPosts();
  return posts.filter((post) => canAccessTier(tier, post.required_tier));
}

export async function getFeedPostsForTier(tier: Tier) {
  noStore();
  const posts = await getPublishedFeedPosts();

  return posts.map((post) => ({
    ...post,
    is_locked: !canAccessTier(tier, post.required_tier)
  }));
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

export async function getPostBySlugForViewer(slug: string, tier: Tier) {
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

  return {
    ...post,
    is_locked: !canAccessTier(tier, post.required_tier)
  };
}

export async function getSignedMediaUrls(paths: string[]) {
  noStore();

  if (!paths.length) return {};

  const admin = createAdminSupabaseClient();
  const entries = await Promise.all(
    [...new Set(paths)].map(async (path) => [
      path,
      (await getMediaUrl(
        {
          provider: isR2StoragePath(path) ? "r2" : "supabase",
          storage_path: path
        },
        { supabase: admin, legacyBucket: "post-media" }
      )) ?? ""
    ] as const)
  );

  return Object.fromEntries(entries);
}
