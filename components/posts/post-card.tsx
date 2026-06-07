import Image from "next/image";
import { Route } from "next";
import { PostNavLink } from "@/components/posts/post-nav-link";
import { PostReactions } from "@/components/posts/post-reactions";
import { ReactionSummary } from "@/lib/data/reactions";
import { FeedPost, Tier } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { TIER_LABELS } from "@/lib/utils/tier";

const POST_TYPE_LABELS: Record<string, string> = {
  announcement: "Объявление",
  text: "Текст",
  gallery: "Галерея",
  video: "Видео"
};

const TIER_CARD_STYLES: Record<
  Tier,
  {
    article: string;
    tierBadge: string;
    action: string;
  }
> = {
  tier_1: {
    article: "border-white/10 bg-[#191a22]",
    tierBadge: "border-white/10 bg-white/[0.03] text-white/65",
    action: "bg-white text-slate-950 hover:bg-white/92"
  },
  tier_2: {
    article: "border-white/10 bg-[#191a22]",
    tierBadge: "border-white/10 bg-white/[0.03] text-white/65",
    action: "bg-white text-slate-950 hover:bg-white/92"
  },
  tier_3: {
    article: "border-white/10 bg-[#201811]",
    tierBadge: "border-white/10 bg-white/[0.03] text-white/70",
    action: "bg-[#ffe2a9] text-[#2c1d08] hover:bg-[#ffdf9b]"
  },
  tier_4: {
    article: "border-white/10 bg-[#191a22]",
    tierBadge: "border-white/10 bg-white/[0.03] text-white/65",
    action: "bg-white text-slate-950 hover:bg-white/92"
  }
};

export function PostCard({
  post,
  commentCount = 0,
  reactionSummary,
  routeBase = "/club"
}: {
  post: FeedPost;
  commentCount?: number;
  reactionSummary: ReactionSummary;
  routeBase?: string;
}) {
  const locked = Boolean(post.is_locked);
  const tierStyle = TIER_CARD_STYLES[post.required_tier];

  return (
    <article className={`overflow-hidden rounded-[24px] border ${tierStyle.article} shadow-[0_12px_28px_rgba(0,0,0,0.12)]`}>
      {post.thumbnail_url ? (
        <div className="relative border-b border-white/10">
          <Image
            src={post.thumbnail_url}
            alt={post.title}
            width={1600}
            height={900}
            unoptimized
            className={`h-44 w-full object-cover transition ${locked ? "scale-[1.03] blur-sm brightness-50" : ""}`}
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

      <div className="border-b border-white/8 px-4 py-3.5">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white/60">
            {POST_TYPE_LABELS[post.post_type] ?? post.post_type}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs ${tierStyle.tierBadge}`}>
            {TIER_LABELS[post.required_tier]}
          </span>
          {locked ? (
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
              Закрыто
            </span>
          ) : null}
        </div>

        <h3 className="font-display text-[1.45rem] font-semibold leading-[1.05] text-white sm:text-[1.6rem]">
          {post.title}
        </h3>
      </div>

      <div className="px-4 py-3.5">
        <div className="mb-3 flex items-center justify-between text-[13px] text-white/42">
          <span>{formatDate(post.publish_at)}</span>
          <span>{post.post_media?.length ?? 0} media</span>
        </div>

        <div className="mb-3">
          <PostReactions postId={post.id} postSlug={post.slug} summary={reactionSummary} />
        </div>

        <div className="flex flex-wrap gap-2.5">
          <PostNavLink
            href={`${routeBase}/${post.slug}` as Route}
            className={`inline-flex rounded-[18px] px-4 py-2 text-[13px] font-medium transition ${
              locked
                ? "border border-white/10 bg-white/[0.03] text-white/72 hover:border-white/16 hover:bg-white/[0.05]"
                : tierStyle.action
            }`}
          >
            {locked ? "Смотреть условия" : "Открыть пост"}
          </PostNavLink>

          {!locked ? (
            <PostNavLink
              href={`${routeBase}/${post.slug}#comments` as Route}
              className="inline-flex rounded-[18px] border border-white/10 px-4 py-2 text-[13px] font-medium text-white/70 transition hover:border-white/16 hover:bg-white/[0.05] hover:text-white"
            >
              Комментарии: {commentCount}
            </PostNavLink>
          ) : null}
        </div>
      </div>
    </article>
  );
}
