export const dynamic = "force-dynamic";

import { PrivateShell } from "@/components/layout/private-shell";
import { PostCard } from "@/components/posts/post-card";
import { requireProfile } from "@/lib/auth/guards";
import { getSignedMediaUrls, getVisiblePostsForTier } from "@/lib/data/posts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function FeedPage() {
  const profile = await requireProfile();
  let nextProfile = profile;

  if (profile.role !== "admin") {
    const supabase = await createServerSupabaseClient();
    const seenAt = new Date().toISOString();
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
