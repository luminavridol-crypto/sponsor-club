import Image from "next/image";
import Link from "next/link";
import { Route } from "next";
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
  reactionSummary,
  routeBase = "/club"
}: {
  post: PostWithMedia;
  commentCount?: number;
  reactionSummary: ReactionSummary;
  routeBase?: string;
}) {
  const locked = Boolean(post.is_locked);

  return (
    <article className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-glow">
      {post.thumbnail_url ? (
        <div className="relative border-b border-white/10">
          <Image
            src={post.thumbnail_url}
            alt={post.title}
            width={1600}
            height={900}
            unoptimized
            className={`h-56 w-full object-cover transition ${locked ? "scale-[1.03] blur-sm brightness-50" : ""}`}
          />
          {locked ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
              <div className="rounded-2xl border border-white/15 bg-black/45 px-4 py-3 text-center backdrop-blur">
                <p className="text-lg font-semibold text-white">🔒</p>
                <p className="mt-1 text-sm text-white/85">Нужен уровень {TIER_LABELS[post.required_tier]}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="border-b border-white/10 bg-gradient-to-br from-accent/10 to-cyanGlow/10 px-5 py-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-accentSoft">
            {POST_TYPE_LABELS[post.post_type] ?? post.post_type}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
            {TIER_LABELS[post.required_tier]}
          </span>
          {locked ? (
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
              Закрыто
            </span>
          ) : null}
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
            href={`${routeBase}/${post.slug}` as Route}
            className={`inline-flex rounded-2xl px-4 py-2 text-sm font-medium transition ${
              locked
                ? "border border-white/10 bg-white/5 text-white/75 hover:border-amber-300/30 hover:bg-white/10"
                : "bg-white text-background hover:bg-goldSoft"
            }`}
          >
            {locked ? "Смотреть условия" : "Открыть пост"}
          </Link>
          {!locked ? (
            <Link
              href={`${routeBase}/${post.slug}#comments` as Route}
              className="inline-flex rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-white/75 transition hover:border-accent/30 hover:bg-white/5 hover:text-white"
            >
              Комментарии: {commentCount}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
