export const dynamic = "force-dynamic";

import Link from "next/link";
import { deleteMediaAction } from "@/app/actions";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { PrivateShell } from "@/components/layout/private-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { listBucketFiles } from "@/lib/data/storage-cleanup";
import { getSignedMediaUrls } from "@/lib/data/posts";
import { listR2Media } from "@/lib/storage/media";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type MediaItem = {
  id: string;
  title: string;
  slug: string;
  path: string;
  provider: "r2" | "supabase";
  bucket: string;
  objectKey: string;
  type: "image" | "video";
  source: "thumbnail" | "media" | "r2-storage" | "legacy-storage";
  sizeBytes: number | null;
  mimeType: string | null;
  createdAt: string | null;
  linked: boolean;
};

function getMediaTypeFromPath(path: string): "image" | "video" {
  const normalized = path.toLowerCase();
  return normalized.endsWith(".mp4") || normalized.endsWith(".mov") || normalized.endsWith(".webm")
    ? "video"
    : "image";
}

function formatBytes(value: number | null) {
  if (!value) return "unknown";
  if (value >= 1024 * 1024 * 1024) return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function formatDate(value: string | Date | null) {
  if (!value) return "unknown";
  return new Date(value).toLocaleString("ru-RU");
}

export default async function AdminMediaPage() {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();
  const [{ data: posts }, { data: media }, legacyPaths, r2Objects] = await Promise.all([
    admin
      .from("posts")
      .select(
        "id, title, slug, thumbnail_path, thumbnail_provider, thumbnail_bucket, thumbnail_object_key, thumbnail_mime_type, thumbnail_size_bytes, created_at"
      )
      .not("thumbnail_path", "is", null)
      .order("created_at", { ascending: false }),
    admin
      .from("post_media")
      .select(
        "id, storage_path, storage_provider, storage_bucket, storage_object_key, mime_type, size_bytes, media_type, created_at, posts(title, slug)"
      )
      .order("created_at", { ascending: false }),
    listBucketFiles(admin, "post-media").catch(() => []),
    listR2Media().catch(() => [])
  ]);

  const linkedItems: MediaItem[] = [
    ...((posts ?? []).map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      path: post.thumbnail_path,
      provider: (post.thumbnail_provider === "r2" ? "r2" : "supabase") as "r2" | "supabase",
      bucket: post.thumbnail_bucket ?? "post-media",
      objectKey: post.thumbnail_object_key ?? post.thumbnail_path,
      type: "image" as const,
      source: "thumbnail" as const,
      sizeBytes: post.thumbnail_size_bytes ?? null,
      mimeType: post.thumbnail_mime_type ?? null,
      createdAt: post.created_at,
      linked: true
    }))),
    ...((media ?? []).map((item) => {
      const post = Array.isArray(item.posts) ? item.posts[0] : item.posts;
      return {
        id: item.id,
        title: post?.title ?? "Пост",
        slug: post?.slug ?? "",
        path: item.storage_path,
        provider: (item.storage_provider === "r2" || item.storage_path?.startsWith("r2:")
          ? "r2"
          : "supabase") as "r2" | "supabase",
        bucket: item.storage_bucket ?? "post-media",
        objectKey: item.storage_object_key ?? item.storage_path,
        type: item.media_type,
        source: "media" as const,
        sizeBytes: item.size_bytes ?? null,
        mimeType: item.mime_type ?? null,
        createdAt: item.created_at,
        linked: true
      };
    }))
  ].filter((item) => Boolean(item.path));

  const linkedPaths = new Set(linkedItems.map((item) => item.path));
  const r2StorageItems: MediaItem[] = r2Objects
    .filter((item) => !linkedPaths.has(item.storagePath))
    .map((item) => ({
      id: `r2-${item.objectKey}`,
      title: "Не привязано к посту",
      slug: "",
      path: item.storagePath,
      provider: "r2" as const,
      bucket: item.bucket,
      objectKey: item.objectKey,
      type: item.contentType?.startsWith("video/") ? "video" : getMediaTypeFromPath(item.objectKey),
      source: "r2-storage" as const,
      sizeBytes: item.sizeBytes,
      mimeType: item.contentType,
      createdAt: item.lastModified?.toISOString() ?? null,
      linked: false
    }));

  const legacyItems: MediaItem[] = legacyPaths
    .filter((path) => !linkedPaths.has(path))
    .map((path) => ({
      id: `legacy-${path}`,
      title: "Legacy Supabase media",
      slug: "",
      path,
      provider: "supabase" as const,
      bucket: "post-media",
      objectKey: path,
      type: getMediaTypeFromPath(path),
      source: "legacy-storage" as const,
      sizeBytes: null,
      mimeType: null,
      createdAt: null,
      linked: false
    }));

  const r2Items = [
    ...linkedItems.filter((item) => item.provider === "r2"),
    ...r2StorageItems
  ];
  const legacyLinkedItems = linkedItems.filter((item) => item.provider === "supabase");
  const signedUrls = await getSignedMediaUrls([...r2Items, ...legacyLinkedItems, ...legacyItems].map((item) => item.path));

  function renderItem(item: MediaItem) {
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
              {item.provider}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">
              {item.type}
            </span>
            <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs text-accentSoft">
              {item.linked ? "linked" : "orphan"}
            </span>
          </div>
          <h3 className="break-words text-lg font-semibold text-white">{item.title}</h3>
          <div className="space-y-1 text-xs text-white/45">
            <p className="break-all">key: {item.objectKey}</p>
            <p>bucket: {item.bucket}</p>
            <p>mime: {item.mimeType ?? "unknown"}</p>
            <p>size: {formatBytes(item.sizeBytes)}</p>
            <p>date: {formatDate(item.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {item.slug ? (
              <Link
                href={`/feed/${item.slug}`}
                className="inline-flex rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/75 transition hover:border-accent/30 hover:bg-white/5 hover:text-white"
              >
                Открыть пост
              </Link>
            ) : null}
            <ConfirmActionForm
              action={deleteMediaAction}
              confirmMessage="Удалить этот файл из хранилища и обновить базу?"
              buttonLabel="Удалить"
              buttonClassName="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-400/20"
              hiddenFields={[
                { name: "id", value: item.id },
                {
                  name: "source",
                  value:
                    item.source === "r2-storage" || item.source === "legacy-storage"
                      ? "storage"
                      : item.source
                },
                { name: "provider", value: item.provider },
                { name: "bucket", value: item.bucket },
                { name: "objectKey", value: item.objectKey },
                { name: "path", value: item.path }
              ]}
            />
          </div>
        </div>
      </article>
    );
  }

  return (
    <PrivateShell profile={profile} admin>
      <section className="space-y-5">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">Media Library</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Медиа-библиотека</h2>
          <p className="mt-3 text-sm leading-7 text-white/62">
            R2: {r2Items.length} файлов. Legacy Supabase media: {legacyItems.length + legacyLinkedItems.length || "empty"}.
          </p>
        </div>

        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-white">Cloudflare R2</h3>
          {r2Items.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{r2Items.map(renderItem)}</div>
          ) : (
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-white/55">
              R2 media: empty.
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-white">Legacy Supabase media</h3>
          {legacyLinkedItems.length || legacyItems.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[...legacyLinkedItems, ...legacyItems].map(renderItem)}
            </div>
          ) : (
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-white/55">
              Legacy Supabase media: empty.
            </div>
          )}
        </section>
      </section>
    </PrivateShell>
  );
}
