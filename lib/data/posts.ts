import { unstable_cache, unstable_noStore as noStore } from "next/cache";
import { hasClubAccess } from "@/lib/auth/access";
import { getApprovedPurchasedPostIds } from "@/lib/data/post-purchases";
import { getMediaUrl, isR2StoragePath } from "@/lib/storage/media";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { FeedPost, PostWithMedia, Profile, Tier } from "@/lib/types";
import { canAccessTier } from "@/lib/utils/tier";

function isMissingPostSalesColumn(message: string) {
  const normalizedMessage = message.toLowerCase();
  const mentionsSalesField =
    normalizedMessage.includes("is_sellable") || normalizedMessage.includes("sale_price");

  return (
    mentionsSalesField &&
    (normalizedMessage.includes("posts") ||
      normalizedMessage.includes("post") ||
      normalizedMessage.includes("column") ||
      normalizedMessage.includes("schema cache"))
  );
}

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
  const selectWithSales =
    "id, slug, title, description, post_type, required_tier, is_sellable, sale_price, publish_at, expires_at, thumbnail_path, post_media(id)";
  const selectWithoutSales =
    "id, slug, title, description, post_type, required_tier, publish_at, expires_at, thumbnail_path, post_media(id)";

  const { data, error } = await admin
    .from("posts")
    .select(selectWithSales)
    .eq("status", "published")
    .lte("publish_at", new Date().toISOString())
    .order("publish_at", { ascending: false });

  const posts = data
    ? (data as Array<FeedPost & { expires_at?: string | null }>)
    : error?.message && isMissingPostSalesColumn(error.message)
      ? ((await admin
          .from("posts")
          .select(selectWithoutSales)
          .eq("status", "published")
          .lte("publish_at", new Date().toISOString())
          .order("publish_at", { ascending: false })).data ?? []) as Array<
          FeedPost & { expires_at?: string | null }
        >
      : [];
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

export async function getFeedPostsForProfile(
  profile: Pick<Profile, "role" | "tier" | "email" | "access_status" | "access_expires_at">
) {
  noStore();

  if (profile.role === "admin") {
    return getFeedPostsForTier("tier_4");
  }

  if (hasClubAccess(profile as Profile)) {
    return getFeedPostsForTier(profile.tier);
  }

  const grantedPostIds = await getApprovedPurchasedPostIds(profile as Pick<Profile, "email">);

  if (!grantedPostIds.length) {
    return [];
  }

  const posts = await getPublishedFeedPosts();

  return posts
    .filter((post) => grantedPostIds.includes(post.id))
    .map((post) => ({
      ...post,
      is_locked: false
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

export async function getPostBySlugForProfile(
  slug: string,
  profile: Pick<Profile, "role" | "tier" | "email" | "access_status" | "access_expires_at">
) {
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

  if (profile.role === "admin") {
    return {
      ...post,
      is_locked: false
    };
  }

  if (hasClubAccess(profile as Profile)) {
    return {
      ...post,
      is_locked: !canAccessTier(profile.tier, post.required_tier)
    };
  }

  const grantedPostIds = await getApprovedPurchasedPostIds(profile as Pick<Profile, "email">);

  if (!grantedPostIds.includes(post.id)) {
    return null;
  }

  return {
    ...post,
    is_locked: false
  };
}

export async function getSignedMediaUrls(paths: string[]) {
  if (!paths.length) return {};

  const getCachedSignedMediaUrl = unstable_cache(
    async (path: string) => {
      const admin = createAdminSupabaseClient();
      return (
        (await getMediaUrl(
          {
            provider: isR2StoragePath(path) ? "r2" : "supabase",
            storage_path: path
          },
          { supabase: admin, legacyBucket: "post-media" }
        )) ?? ""
      );
    },
    ["signed-post-media-url"],
    {
      revalidate: 300
    }
  );

  const entries = await Promise.all(
    [...new Set(paths)].map(async (path) => [path, await getCachedSignedMediaUrl(path)] as const)
  );

  return Object.fromEntries(entries);
}
