import { notFound } from "next/navigation";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { PostComments } from "@/components/posts/post-comments";
import { PostReactions } from "@/components/posts/post-reactions";
import { ProtectedMedia } from "@/components/posts/protected-media";
import { requireProfile } from "@/lib/auth/guards";
import { getCommentsForPost, getReactionSummariesForComments } from "@/lib/data/comments";
import { getPostBySlugForTier, getSignedMediaUrls } from "@/lib/data/posts";
import { getReactionSummaryForPost } from "@/lib/data/reactions";
import { formatDate } from "@/lib/utils/format";

export default async function TelegramContentPostPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const profile = await requireProfile();
  const { slug } = await params;
  const post = await getPostBySlugForTier(slug, profile.tier);

  if (!post) {
    notFound();
  }

  const mediaMap = await getSignedMediaUrls([
    ...post.post_media.map((item) => item.storage_path),
    ...(post.thumbnail_path ? [post.thumbnail_path] : [])
  ]);
  const thumbnailUrl = post.thumbnail_path ? mediaMap[post.thumbnail_path] ?? null : null;
  const comments = await getCommentsForPost(post.id);
  const reactionSummary = await getReactionSummaryForPost(post.id, profile.id);
  const commentReactionSummaries = await getReactionSummariesForComments(
    comments.map((comment) => comment.id),
    profile.id
  );

  return (
    <MiniAppShell profile={profile} title={post.title} subtitle={`Опубликовано ${formatDate(post.publish_at)}`}>
      <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-accentSoft">{post.post_type}</p>
        {post.description ? <p className="mt-3 text-sm leading-6 text-white/65">{post.description}</p> : null}
        <div className="mt-4">
          <PostReactions postId={post.id} postSlug={post.slug} summary={reactionSummary} />
        </div>
      </section>

      {thumbnailUrl ? (
        <ProtectedMedia kind="image" src={thumbnailUrl} alt={post.title} className="w-full" />
      ) : null}

      {post.body ? (
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/80">
          {post.body}
        </section>
      ) : null}

      {post.post_media.length ? (
        <section className="grid gap-3">
          {post.post_media.map((media) => {
            const signedUrl = mediaMap[media.storage_path];

            if (!signedUrl) {
              return null;
            }

            return media.media_type === "video" ? (
              <ProtectedMedia key={media.id} kind="video" src={signedUrl} alt={post.title} />
            ) : (
              <ProtectedMedia key={media.id} kind="image" src={signedUrl} alt={post.title} />
            );
          })}
        </section>
      ) : null}

      <PostComments
        postId={post.id}
        postSlug={post.slug}
        comments={comments}
        currentProfileId={profile.id}
        admin={profile.role === "admin"}
        reactionSummaries={commentReactionSummaries}
      />
    </MiniAppShell>
  );
}
