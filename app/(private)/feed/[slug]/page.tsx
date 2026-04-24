import { notFound } from "next/navigation";
import { PrivateShell } from "@/components/layout/private-shell";
import { PostComments } from "@/components/posts/post-comments";
import { PostReactions } from "@/components/posts/post-reactions";
import { ProtectedMedia } from "@/components/posts/protected-media";
import { requireProfile } from "@/lib/auth/guards";
import { getCommentsForPost } from "@/lib/data/comments";
import { getPostBySlugForTier, getSignedMediaUrls } from "@/lib/data/posts";
import { formatDate } from "@/lib/utils/format";

export default async function PostDetailPage({
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

  return (
    <PrivateShell profile={profile} admin={profile.role === "admin"}>
      <article className="space-y-6">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">{post.post_type}</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">{post.title}</h2>
          <p className="mt-4 text-sm leading-7 text-white/66">{post.description}</p>
          <p className="mt-4 text-sm text-white/40">Опубликовано: {formatDate(post.publish_at)}</p>
          <div className="mt-5">
            <PostReactions postId={post.id} />
          </div>
        </div>

        {thumbnailUrl ? (
          <ProtectedMedia kind="image" src={thumbnailUrl} alt={post.title} className="w-full" />
        ) : null}

        {post.body ? (
          <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 text-sm leading-7 text-white/80">
            {post.body}
          </section>
        ) : null}

        {post.post_media.length ? (
          <section className="grid gap-4 md:grid-cols-2">
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
        />
      </article>
    </PrivateShell>
  );
}
