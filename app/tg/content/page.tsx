export const dynamic = "force-dynamic";

import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { PostCard } from "@/components/posts/post-card";
import { requireProfile } from "@/lib/auth/guards";
import { getCommentCountsForPosts } from "@/lib/data/comments";
import { getVisiblePostsForTier, getSignedMediaUrls } from "@/lib/data/posts";
import { getReactionSummariesForPosts } from "@/lib/data/reactions";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function TelegramContentPage() {
  const profile = await requireProfile();
  const admin = createAdminSupabaseClient();
  const seenAt = new Date().toISOString();

  await admin.from("profiles").update({ last_content_seen_at: seenAt }).eq("id", profile.id);

  const posts = await getVisiblePostsForTier(profile.tier);
  const commentCounts = await getCommentCountsForPosts(posts.map((post) => post.id));
  const reactionSummaries = await getReactionSummariesForPosts(
    posts.map((post) => post.id),
    profile.id
  );
  const thumbnailMap = await getSignedMediaUrls(
    posts.map((post) => post.thumbnail_path).filter((path): path is string => Boolean(path))
  );
  const postsWithThumbnails = posts.map((post) => ({
    ...post,
    thumbnail_url: post.thumbnail_path ? thumbnailMap[post.thumbnail_path] ?? null : null
  }));

  return (
    <MiniAppShell
      profile={{ ...profile, last_content_seen_at: seenAt }}
      title="Контент"
      subtitle="Сразу открываем закрытую часть клуба без лендинга."
    >
      {postsWithThumbnails.length ? (
        postsWithThumbnails.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            commentCount={commentCounts.get(post.id) ?? 0}
            reactionSummary={reactionSummaries.get(post.id)!}
            routeBase="/tg/content"
          />
        ))
      ) : (
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-sm text-white/60">
          Пока здесь нет опубликованных материалов.
        </section>
      )}
    </MiniAppShell>
  );
}
