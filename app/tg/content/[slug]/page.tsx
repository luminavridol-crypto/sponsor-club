import { notFound } from "next/navigation";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { PostComments } from "@/components/posts/post-comments";
import { PostReactions } from "@/components/posts/post-reactions";
import { ProtectedMedia } from "@/components/posts/protected-media";
import { requireProfile } from "@/lib/auth/guards";
import { getCommentsForPost, getReactionSummariesForComments } from "@/lib/data/comments";
import { getPostBySlugForViewer, getSignedMediaUrls } from "@/lib/data/posts";
import { getReactionSummaryForPost } from "@/lib/data/reactions";
import { TIER_LABELS } from "@/lib/utils/tier";

export default async function TelegramContentPostPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const profile = await requireProfile();
  const { slug } = await params;
  const visibleTier = profile.role === "admin" ? "tier_3" : profile.tier;
  const post = await getPostBySlugForViewer(slug, visibleTier);

  if (!post) {
    notFound();
  }

  const mediaMap = await getSignedMediaUrls([
    ...post.post_media.map((item) => item.storage_path),
    ...(post.thumbnail_path ? [post.thumbnail_path] : [])
  ]);
  const thumbnailUrl = post.thumbnail_path ? mediaMap[post.thumbnail_path] ?? null : null;

  if (post.is_locked) {
    return (
      <MiniAppShell profile={profile} title={post.title}>
        {thumbnailUrl ? (
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-glow">
            <ProtectedMedia kind="image" src={thumbnailUrl} alt={post.title} className="w-full blur-[2px]" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
              <div className="max-w-sm rounded-[28px] border border-white/10 bg-black/55 px-5 py-6 text-center backdrop-blur">
                <p className="text-3xl">🔒</p>
                <h2 className="mt-3 text-xl font-semibold text-white">Контент закрыт</h2>
                <p className="mt-3 text-sm leading-6 text-white/70">
                  Этот пост доступен только для уровня {TIER_LABELS[post.required_tier]}. В ленте он виден как анонс, но открыть содержимое пока нельзя.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-accentSoft">Нужен уровень</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{TIER_LABELS[post.required_tier]}</h3>
          {post.description ? <p className="mt-3 text-sm leading-6 text-white/65">{post.description}</p> : null}
        </section>
      </MiniAppShell>
    );
  }

  const comments = await getCommentsForPost(post.id);
  const reactionSummary = await getReactionSummaryForPost(post.id, profile.id);
  const commentReactionSummaries = await getReactionSummariesForComments(
    comments.map((comment) => comment.id),
    profile.id
  );

  return (
    <MiniAppShell profile={profile} title={post.title}>
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
