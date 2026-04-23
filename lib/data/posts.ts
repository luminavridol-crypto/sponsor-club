import { unstable_noStore as noStore } from "next/cache";
import { getSignedR2Urls, isR2StoragePath } from "@/lib/r2/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
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

  if (!paths.length) return {};

  const admin = createAdminSupabaseClient();
  const supabasePaths = paths.filter((path) => !isR2StoragePath(path));
  const r2Paths = paths.filter(isR2StoragePath);
  const result: Record<string, string> = {};

  if (supabasePaths.length) {
    const { data } = await admin.storage.from("post-media").createSignedUrls(
      supabasePaths,
      60 * 60
    );

    Object.assign(
      result,
      Object.fromEntries((data ?? []).map((item) => [item.path, item.signedUrl ?? ""]))
    );
  }

  if (r2Paths.length) {
    Object.assign(result, await getSignedR2Urls(r2Paths, 60 * 60));
  }

  return result;
}
