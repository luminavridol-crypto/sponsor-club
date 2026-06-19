import { notFound } from "next/navigation";
import type { Route } from "next";
import { deletePostAction } from "@/app/actions";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { MiniAppBackButton } from "@/components/telegram/mini-app-back-button";
import { PostNavLink } from "@/components/posts/post-nav-link";
import { PostComments } from "@/components/posts/post-comments";
import { PostReactions } from "@/components/posts/post-reactions";
import { ProtectedMedia } from "@/components/posts/protected-media";
import { requireProfile } from "@/lib/auth/guards";
import { getCommentsForPost, getReactionSummariesForComments } from "@/lib/data/comments";
import { getPostBySlugForViewer, getSignedMediaUrls } from "@/lib/data/posts";
import { getReactionSummaryForPost } from "@/lib/data/reactions";
import { formatEuroAmount } from "@/lib/utils/money";
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

export default async function TelegramContentPostPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const profile = await requireProfile();
  const { slug } = await params;
  const visibleTier = profile.role === "admin" ? "tier_4" : profile.tier;
  const post = await getPostBySlugForViewer(slug, visibleTier);

  if (!post) {
    notFound();
  }

  if (post.is_locked) {
    const mediaMap = await getSignedMediaUrls(post.thumbnail_path ? [post.thumbnail_path] : []);
    const thumbnailUrl = post.thumbnail_path ? mediaMap[post.thumbnail_path] ?? null : null;

    return (
      <MiniAppShell profile={profile} title={post.title}>
        <div className="flex items-center justify-between gap-3">
          <MiniAppBackButton />
          {profile.role === "admin" ? (
            <ConfirmActionForm
              action={deletePostAction}
              confirmMessage={`Удалить пост "${post.title}"?`}
              buttonLabel={<TrashIcon />}
              buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200/14 bg-rose-500/8 text-rose-100 transition hover:bg-rose-500/12"
              hiddenFields={[{ name: "postId", value: post.id }]}
            />
          ) : null}
        </div>
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
          {post.is_sellable && post.sale_price != null ? (
            <div className="mt-4 rounded-[20px] border border-fuchsia-300/15 bg-fuchsia-400/10 px-4 py-3 text-sm text-fuchsia-50">
              Цена поста: <span className="font-medium text-white">{formatEuroAmount(post.sale_price) ?? "Продажа"}</span>
            </div>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">Превью</p>
          <div className="mt-3 select-none space-y-2 opacity-75 blur-[2px]">
            <div className="h-4 w-5/6 rounded-full bg-white/12" />
            <div className="h-4 w-full rounded-full bg-white/10" />
            <div className="h-4 w-4/6 rounded-full bg-white/12" />
            <div className="mt-4 h-28 rounded-[22px] bg-[linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.02))]" />
          </div>
        </section>

        {post.is_sellable ? (
          <PostNavLink
            href={
              `/tg/support?tier=${post.required_tier}&postTitle=${encodeURIComponent(post.title)}${
                post.sale_price != null
                  ? `&postPrice=${encodeURIComponent(String(post.sale_price))}`
                  : ""
              }` as Route
            }
            className="inline-flex w-full items-center justify-center rounded-[22px] border border-fuchsia-200/18 bg-fuchsia-400/12 px-4 py-3 text-sm font-semibold text-white transition hover:border-fuchsia-200/28 hover:bg-fuchsia-400/16"
          >
            Купить пост
          </PostNavLink>
        ) : (
          <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
            Покупка для этого поста отключена.
          </div>
        )}
      </MiniAppShell>
    );
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
    <MiniAppShell profile={profile} title={post.title}>
      <div className="flex items-center justify-between gap-3">
        <MiniAppBackButton />
        {profile.role === "admin" ? (
          <ConfirmActionForm
            action={deletePostAction}
            confirmMessage={`Удалить пост "${post.title}"?`}
            buttonLabel={<TrashIcon />}
            buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200/14 bg-rose-500/8 text-rose-100 transition hover:bg-rose-500/12"
            hiddenFields={[{ name: "postId", value: post.id }]}
          />
        ) : null}
      </div>
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
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/80 whitespace-pre-wrap">
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
