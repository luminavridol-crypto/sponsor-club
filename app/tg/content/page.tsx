export const dynamic = "force-dynamic";

import { PostCard } from "@/components/posts/post-card";
import { FeedScrollRestoration } from "@/components/telegram/feed-scroll-restoration";
import { FeedSeenMarker } from "@/components/telegram/feed-seen-marker";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { requireProfile } from "@/lib/auth/guards";
import { getCommentCountsForPosts } from "@/lib/data/comments";
import { getFeedPostsForTier, getSignedMediaUrls } from "@/lib/data/posts";
import { getReactionSummariesForPosts } from "@/lib/data/reactions";

export default async function TelegramContentPage() {
  const profile = await requireProfile();
  const visibleTier = profile.role === "admin" ? "tier_4" : profile.tier;
  const posts = await getFeedPostsForTier(visibleTier);

  const [commentCounts, reactionSummaries, thumbnailMap] = await Promise.all([
    getCommentCountsForPosts(posts.map((post) => post.id)),
    getReactionSummariesForPosts(posts.map((post) => post.id), profile.id),
    getSignedMediaUrls(
      posts.map((post) => post.thumbnail_path).filter((path): path is string => Boolean(path))
    )
  ]);

  const postsWithThumbnails = posts.map((post) => ({
    ...post,
    thumbnail_url: post.thumbnail_path ? thumbnailMap[post.thumbnail_path] ?? null : null
  }));

  return (
    <MiniAppShell profile={profile} title="Лента">
      <FeedSeenMarker />
      <FeedScrollRestoration />
      {postsWithThumbnails.length ? (
        postsWithThumbnails.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            commentCount={commentCounts.get(post.id) ?? 0}
            reactionSummary={reactionSummaries.get(post.id)!}
            routeBase="/tg/content"
            canDelete={profile.role === "admin"}
          />
        ))
      ) : (
        <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
          В ленте пока нет опубликованных материалов.
        </section>
      )}
    </MiniAppShell>
  );
}
