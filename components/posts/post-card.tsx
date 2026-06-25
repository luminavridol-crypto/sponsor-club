import Image from "next/image";
import { Route } from "next";
import { deletePostAction } from "@/app/actions";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { PostNavLink } from "@/components/posts/post-nav-link";
import { PostReactions } from "@/components/posts/post-reactions";
import { ReactionSummary } from "@/lib/data/reactions";
import { FeedPost, Tier } from "@/lib/types";
import { formatEuroAmount } from "@/lib/utils/money";
import { formatDate } from "@/lib/utils/format";
import { TIER_LABELS } from "@/lib/utils/tier";

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

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
    frame?: string;
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
    article:
      "border-violet-300/18 bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.16),transparent_26%),radial-gradient(circle_at_30%_80%,rgba(76,29,149,0.18),transparent_28%),linear-gradient(180deg,rgba(8,8,12,0.98),rgba(14,10,24,0.98))]",
    frame:
      "shadow-[0_0_34px_rgba(139,92,246,0.16),0_18px_44px_rgba(0,0,0,0.28)] before:absolute before:inset-0 before:pointer-events-none before:rounded-[24px] before:bg-[radial-gradient(circle_at_78%_18%,rgba(196,181,253,0.08),transparent_16%),radial-gradient(circle_at_22%_78%,rgba(168,85,247,0.10),transparent_22%)] before:opacity-100",
    tierBadge: "border-violet-300/18 bg-violet-400/10 text-violet-100",
    action: "bg-white text-slate-950 hover:bg-white/92"
  }
};

export function PostCard({
  post,
  commentCount = 0,
  reactionSummary,
  routeBase = "/club",
  canDelete = false
}: {
  post: FeedPost;
  commentCount?: number;
  reactionSummary: ReactionSummary;
  routeBase?: string;
  canDelete?: boolean;
}) {
  const locked = Boolean(post.is_locked);
  const tierStyle = TIER_CARD_STYLES[post.required_tier];
  const tiersHref = `/tg/tiers?openTier=${post.required_tier}&postSlug=${encodeURIComponent(post.slug)}${
    post.title ? `&postTitle=${encodeURIComponent(post.title)}` : ""
  }${post.sale_price != null ? `&postPrice=${encodeURIComponent(String(post.sale_price))}` : ""}`;

  return (
    <article
      className={`relative overflow-hidden rounded-[24px] border ${tierStyle.article} ${
        tierStyle.frame ?? "shadow-[0_12px_28px_rgba(0,0,0,0.12)]"
      }`}
    >
      {canDelete ? (
        <div className="absolute right-3 top-3 z-10">
          <ConfirmActionForm
            action={deletePostAction}
            confirmMessage={`Удалить пост "${post.title}"?`}
            buttonLabel={<TrashIcon />}
            buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200/14 bg-rose-500/8 text-rose-100 transition hover:bg-rose-500/12"
            hiddenFields={[{ name: "postId", value: post.id }]}
          />
        </div>
      ) : null}

      {post.required_tier === "tier_4" ? (
        <>
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <div className="absolute -left-10 top-8 h-20 w-20 rounded-full bg-violet-400/10 blur-3xl" />
            <div className="absolute -right-6 bottom-10 h-24 w-24 rounded-full bg-fuchsia-400/10 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(196,181,253,0.08),transparent_16%),radial-gradient(circle_at_28%_78%,rgba(168,85,247,0.10),transparent_22%)]" />
          </div>
        </>
      ) : null}

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

      <div className="relative border-b border-white/8 px-4 py-3.5">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white/60">
            {POST_TYPE_LABELS[post.post_type] ?? post.post_type}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs ${tierStyle.tierBadge}`}>
            {TIER_LABELS[post.required_tier]}
          </span>
          {post.is_sellable && post.sale_price != null ? (
            <span className="rounded-full border border-fuchsia-300/18 bg-fuchsia-400/10 px-3 py-1 text-xs text-fuchsia-50">
              {formatEuroAmount(post.sale_price) ?? "Продажа"}
            </span>
          ) : null}
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
            Открыть пост
          </PostNavLink>

          {locked && post.is_sellable ? (
            <PostNavLink
              href={
                `/tg/support?tier=${post.required_tier}&postSlug=${encodeURIComponent(post.slug)}&postTitle=${encodeURIComponent(post.title)}${
                  post.sale_price != null
                    ? `&postPrice=${encodeURIComponent(String(post.sale_price))}`
                    : ""
                }` as Route
              }
              className="inline-flex rounded-[18px] border border-fuchsia-200/18 bg-fuchsia-400/10 px-4 py-2 text-[13px] font-medium text-white/90 transition hover:border-fuchsia-200/28 hover:bg-fuchsia-400/14"
            >
              Купить пост
            </PostNavLink>
          ) : null}

          {locked ? (
            <PostNavLink
              href={tiersHref as Route}
              className="inline-flex rounded-[18px] border border-white/10 px-4 py-2 text-[13px] font-medium text-white/70 transition hover:border-white/16 hover:bg-white/[0.05] hover:text-white"
            >
              Смотреть условия
            </PostNavLink>
          ) : null}

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
