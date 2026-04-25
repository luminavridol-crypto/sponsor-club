import Link from "next/link";
import { PostReactions } from "@/components/posts/post-reactions";
import { ReactionSummary } from "@/lib/data/reactions";
import { PostWithMedia } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { TIER_LABELS } from "@/lib/utils/tier";

const POST_TYPE_LABELS: Record<string, string> = {
  announcement: "Объявление",
  text: "Текст",
  gallery: "Галерея",
  video: "Видео"
};

export function PostCard({
  post,
  commentCount = 0,
  reactionSummary
}: {
  post: PostWithMedia;
  commentCount?: number;
  reactionSummary: ReactionSummary;
}) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-glow">
      {post.thumbnail_url ? (
        <img
          src={post.thumbnail_url}
          alt={post.title}
          className="h-56 w-full border-b border-white/10 object-cover"
        />
      ) : null}
      <div className="border-b border-white/10 bg-gradient-to-br from-accent/10 to-cyanGlow/10 px-5 py-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-accentSoft">
            {POST_TYPE_LABELS[post.post_type] ?? post.post_type}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
            {TIER_LABELS[post.required_tier]}
          </span>
        </div>
        <h3 className="text-xl font-semibold text-white">{post.title}</h3>
        {post.description ? <p className="mt-2 text-sm text-white/65">{post.description}</p> : null}
      </div>
      <div className="px-5 py-4">
        <div className="mb-4 flex items-center justify-between text-sm text-white/45">
          <span>{formatDate(post.publish_at)}</span>
          <span>{post.post_media?.length ?? 0} media</span>
        </div>
        <div className="mb-4">
          <PostReactions postId={post.id} postSlug={post.slug} summary={reactionSummary} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/feed/${post.slug}`}
            className="inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-medium text-background transition hover:bg-goldSoft"
          >
            Открыть пост
          </Link>
          <Link
            href={`/feed/${post.slug}#comments`}
            className="inline-flex rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-white/75 transition hover:border-accent/30 hover:bg-white/5 hover:text-white"
          >
            Комментарии: {commentCount}
          </Link>
        </div>
      </div>
    </article>
  );
}
