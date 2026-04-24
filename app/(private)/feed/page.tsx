export const dynamic = "force-dynamic";

import Link from "next/link";
import { PrivateShell } from "@/components/layout/private-shell";
import { PostCard } from "@/components/posts/post-card";
import { requireProfile } from "@/lib/auth/guards";
import { getAdminUnreadPostComments } from "@/lib/data/comments";
import { getSignedMediaUrls, getVisiblePostsForTier } from "@/lib/data/posts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function formatCommentTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function FeedPage() {
  const profile = await requireProfile();
  let nextProfile = profile;
  const unreadComments =
    profile.role === "admin" ? await getAdminUnreadPostComments(profile.last_content_seen_at) : [];

  const supabase = await createServerSupabaseClient();
  const seenAt = new Date().toISOString();

  if (profile.role === "admin") {
    await supabase
      .from("profiles")
      .update({ last_content_seen_at: seenAt })
      .eq("id", profile.id);

    nextProfile = {
      ...profile,
      last_content_seen_at: seenAt
    };
  } else {
    await supabase
      .from("profiles")
      .update({ last_content_seen_at: seenAt })
      .eq("id", profile.id);

    nextProfile = {
      ...profile,
      last_content_seen_at: seenAt
    };
  }

  const posts = await getVisiblePostsForTier(profile.tier);
  const thumbnailMap = await getSignedMediaUrls(
    posts.map((post) => post.thumbnail_path).filter((path): path is string => Boolean(path))
  );
  const postsWithThumbnails = posts.map((post) => ({
    ...post,
    thumbnail_url: post.thumbnail_path ? thumbnailMap[post.thumbnail_path] ?? null : null
  }));

  return (
    <PrivateShell profile={nextProfile} admin={nextProfile.role === "admin"}>
      <section className="space-y-6">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.28em] text-cyanGlow">Content Feed</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Лента закрытого контента</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">
            Публикации автоматически фильтруются по вашему sponsor tier. Tier 2 видит Tier 1 и 2,
            Tier 3 видит весь контент.
          </p>
        </div>

        {profile.role === "admin" && unreadComments.length ? (
          <section className="rounded-[32px] border border-accent/25 bg-accent/10 p-5 shadow-glow">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-accentSoft">
                  New comments
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  Новые комментарии под постами
                </h3>
              </div>
              <p className="text-sm text-white/55">{unreadComments.length} новых</p>
            </div>

            <div className="mt-4 grid gap-3">
              {unreadComments.map((comment) => {
                const author =
                  comment.profiles?.display_name ||
                  comment.profiles?.nickname ||
                  comment.profiles?.email.split("@")[0] ||
                  "Участник";
                const postTitle = comment.posts?.title ?? "Пост";
                const postSlug = comment.posts?.slug;

                return (
                  <article
                    key={comment.id}
                    className="rounded-3xl border border-white/10 bg-black/15 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm text-white/45">
                          {author} • {formatCommentTime(comment.created_at)}
                        </p>
                        <h4 className="mt-1 break-words text-lg font-semibold text-white">
                          {postTitle}
                        </h4>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/70">
                          {comment.body}
                        </p>
                      </div>
                      {postSlug ? (
                        <Link
                          href={`/feed/${postSlug}#comments`}
                          className="shrink-0 rounded-2xl bg-white px-4 py-2 text-center text-sm font-medium text-background transition hover:bg-goldSoft"
                        >
                          Открыть комментарии
                        </Link>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="mx-auto max-w-5xl space-y-5">
          {postsWithThumbnails.length ? (
            postsWithThumbnails.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
              Пока нет контента для отображения.
            </div>
          )}
        </div>
      </section>
    </PrivateShell>
  );
}
