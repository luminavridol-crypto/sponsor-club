export const dynamic = "force-dynamic";

import Link from "next/link";
import { PrivateShell } from "@/components/layout/private-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { listBucketFiles } from "@/lib/data/storage-cleanup";
import { getSignedMediaUrls } from "@/lib/data/posts";
import { listR2StoragePaths } from "@/lib/r2/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type MediaItem = {
  id: string;
  title: string;
  slug: string;
  path: string;
  type: "image" | "video";
  source: "thumbnail" | "media" | "storage";
  createdAt: string;
};

function getMediaTypeFromPath(path: string): "image" | "video" {
  const normalized = path.toLowerCase();

  if (normalized.endsWith(".mp4") || normalized.endsWith(".mov") || normalized.endsWith(".webm")) {
    return "video";
  }

  return "image";
}

export default async function AdminMediaPage() {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();
  const [{ data: posts }, { data: media }, bucketPaths, r2Paths] = await Promise.all([
    admin
      .from("posts")
      .select("id, title, slug, thumbnail_path, created_at")
      .not("thumbnail_path", "is", null)
      .order("created_at", { ascending: false }),
    admin
      .from("post_media")
      .select("id, storage_path, media_type, created_at, posts(title, slug)")
      .order("created_at", { ascending: false }),
    listBucketFiles(admin, "post-media").catch(() => []),
    listR2StoragePaths().catch(() => [])
  ]);

  const linkedItems: MediaItem[] = [
    ...((posts ?? []).map((post) => ({
      id: `thumb-${post.id}`,
      title: post.title,
      slug: post.slug,
      path: post.thumbnail_path,
      type: "image" as const,
      source: "thumbnail" as const,
      createdAt: post.created_at
    }))),
    ...((media ?? []).map((item) => {
      const post = Array.isArray(item.posts) ? item.posts[0] : item.posts;
      return {
        id: item.id,
        title: post?.title ?? "Пост",
        slug: post?.slug ?? "",
        path: item.storage_path,
        type: item.media_type,
        source: "media" as const,
        createdAt: item.created_at
      };
    }))
  ].filter((item) => Boolean(item.path));

  const linkedPaths = new Set(linkedItems.map((item) => item.path));
  const storageItems: MediaItem[] = [...bucketPaths, ...r2Paths]
    .filter((path) => !linkedPaths.has(path))
    .map((path) => ({
      id: `storage-${path}`,
      title: "Не привязано к посту",
      slug: "",
      path,
      type: getMediaTypeFromPath(path),
      source: "storage" as const,
      createdAt: ""
    }));

  const items = [...linkedItems, ...storageItems];
  const signedUrls = await getSignedMediaUrls(items.map((item) => item.path));

  return (
    <PrivateShell profile={profile} admin>
      <section className="space-y-5">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">Media Library</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Медиа-библиотека</h2>
          <p className="mt-3 text-sm leading-7 text-white/62">
            {linkedItems.length} файлов привязано к постам, ещё {storageItems.length} найдено в storage без связи с постом.
          </p>
        </div>

        {items.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const url = signedUrls[item.path];

              return (
                <article key={item.id} className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
                  <div className="aspect-video bg-black/30">
                    {url && item.type === "video" ? (
                      <video src={url} controls preload="metadata" className="h-full w-full object-cover" />
                    ) : url ? (
                      <img src={url} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-white/45">
                        Файл недоступен
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">
                        {item.type}
                      </span>
                      <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs text-accentSoft">
                        {item.source}
                      </span>
                    </div>
                    <h3 className="break-words text-lg font-semibold text-white">{item.title}</h3>
                    <p className="break-all text-xs text-white/38">{item.path}</p>
                    {item.slug ? (
                      <Link
                        href={`/feed/${item.slug}`}
                        className="inline-flex rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/75 transition hover:border-accent/30 hover:bg-white/5 hover:text-white"
                      >
                        Открыть пост
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-white/55">
            Медиа пока нет.
          </div>
        )}
      </section>
    </PrivateShell>
  );
}
