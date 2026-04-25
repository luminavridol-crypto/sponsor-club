import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { cleanupOrphanedStorage } from "@/lib/data/storage-cleanup";
import {
  assertUploadFile,
  getSafeFileExtension,
  getUploadMediaType
} from "@/lib/security/file-uploads";
import { R2_PROVIDER, toR2ObjectKey, uploadMediaToR2 } from "@/lib/storage/media";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PostStatus, PostType, Tier } from "@/lib/types";
import { slugify } from "@/lib/utils/slug";

function formValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function formValues(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

function numberValues(formData: FormData, key: string) {
  return formValues(formData, key).map((value) => Number(value) || 0);
}

function calculateExpirationDate(publishAtIso: string, retentionDays: number) {
  const date = new Date(publishAtIso);
  date.setDate(date.getDate() + retentionDays);
  return date.toISOString();
}

function humanizeStorageError(message: string) {
  if (message.includes("The object exceeded the maximum allowed size")) {
    return "Файл слишком большой для текущего лимита в Supabase Storage. Увеличь лимит bucket `post-media`.";
  }

  if (message.includes("Bucket not found")) {
    return "Bucket `post-media` не найден в Supabase Storage.";
  }

  return message;
}

async function uploadFile(file: File, folder: string) {
  assertUploadFile(file, { allowImages: true, allowVideos: false });
  const extension = getSafeFileExtension(file);
  return uploadMediaToR2(file, `${folder}/${randomUUID()}.${extension}`, file.type);
}

async function uploadPostMedia(file: File, folder: string) {
  assertUploadFile(file);
  const extension = getSafeFileExtension(file);
  return uploadMediaToR2(file, `${folder}/${randomUUID()}.${extension}`, file.type);
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Нужно войти в аккаунт." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, access_status")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin" || profile.access_status !== "active") {
      return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
    }

    const formData = await request.formData();
    const admin = createAdminSupabaseClient();
    await cleanupOrphanedStorage(admin);
    const title = formValue(formData.get("title"));
    const retentionDaysRaw = Number(formValue(formData.get("retentionDays")) || 0);

    if (!title) {
      return NextResponse.json({ error: "Название обязательно." }, { status: 400 });
    }

    const publishAt = formValue(formData.get("publishAt"))
      ? new Date(formValue(formData.get("publishAt"))).toISOString()
      : new Date().toISOString();
    const retentionDays =
      retentionDaysRaw === 30 || retentionDaysRaw === 60 || retentionDaysRaw === 90
        ? retentionDaysRaw
        : 0;
    const expiresAt = retentionDays ? calculateExpirationDate(publishAt, retentionDays) : null;

    const slug = slugify(title);
    const thumbnailFile = formData.get("thumbnail");
    const uploadedThumbnailPath = formValue(formData.get("uploadedThumbnailPath")) || null;
    const uploadedThumbnailProvider = formValue(formData.get("uploadedThumbnailProvider")) || null;
    const uploadedThumbnailBucket = formValue(formData.get("uploadedThumbnailBucket")) || null;
    const uploadedThumbnailObjectKey = formValue(formData.get("uploadedThumbnailObjectKey")) || null;
    const uploadedThumbnailMimeType = formValue(formData.get("uploadedThumbnailMimeType")) || null;
    const uploadedThumbnailSizeBytes = Number(formValue(formData.get("uploadedThumbnailSizeBytes"))) || null;
    const mediaFiles = formData
      .getAll("media")
      .filter((value) => value instanceof File && value.size > 0) as File[];
    const uploadedMediaPaths = formValues(formData, "uploadedMediaPath");
    const uploadedMediaTypes = formValues(formData, "uploadedMediaType");
    const uploadedMediaProviders = formValues(formData, "uploadedMediaProvider");
    const uploadedMediaBuckets = formValues(formData, "uploadedMediaBucket");
    const uploadedMediaObjectKeys = formValues(formData, "uploadedMediaObjectKey");
    const uploadedMediaMimeTypes = formValues(formData, "uploadedMediaMimeType");
    const uploadedMediaSizeBytes = numberValues(formData, "uploadedMediaSizeBytes");

    let thumbnailPath: string | null = uploadedThumbnailPath;
    let thumbnailProvider = uploadedThumbnailProvider;
    let thumbnailBucket = uploadedThumbnailBucket;
    let thumbnailObjectKey = uploadedThumbnailObjectKey;
    let thumbnailMimeType = uploadedThumbnailMimeType;
    let thumbnailSizeBytes = uploadedThumbnailSizeBytes;

    if (thumbnailFile instanceof File && thumbnailFile.size > 0) {
      const uploaded = await uploadFile(thumbnailFile, "thumbnails");
      thumbnailPath = uploaded.storagePath;
      thumbnailProvider = uploaded.provider;
      thumbnailBucket = uploaded.bucket;
      thumbnailObjectKey = uploaded.objectKey;
      thumbnailMimeType = uploaded.contentType;
      thumbnailSizeBytes = uploaded.sizeBytes;
    }

    const { data: post, error } = await admin
      .from("posts")
      .insert({
        title,
        slug,
        description: formValue(formData.get("description")) || null,
        body: formValue(formData.get("body")) || null,
        post_type: formValue(formData.get("postType")) as PostType,
        required_tier: formValue(formData.get("requiredTier")) as Tier,
        status: formValue(formData.get("status")) as PostStatus,
        publish_at: publishAt,
        retention_days: retentionDays || null,
        expires_at: expiresAt,
        thumbnail_path: thumbnailPath,
        thumbnail_provider: thumbnailProvider || (thumbnailPath ? R2_PROVIDER : null),
        thumbnail_bucket: thumbnailBucket,
        thumbnail_object_key: thumbnailObjectKey || (thumbnailPath ? toR2ObjectKey(thumbnailPath) : null),
        thumbnail_mime_type: thumbnailMimeType,
        thumbnail_size_bytes: thumbnailSizeBytes,
        author_id: profile.id
      })
      .select("id")
      .single();

    if (error || !post) {
      await cleanupOrphanedStorage(admin);
      return NextResponse.json(
        { error: error?.message || "Не удалось создать пост." },
        { status: 500 }
      );
    }

    const directUploads = uploadedMediaPaths.map((storagePath, index) => ({
      storagePath,
      mediaType: uploadedMediaTypes[index] === "video" ? "video" : "image",
      provider: uploadedMediaProviders[index] || R2_PROVIDER,
      bucket: uploadedMediaBuckets[index] || null,
      objectKey: uploadedMediaObjectKeys[index] || toR2ObjectKey(storagePath),
      mimeType: uploadedMediaMimeTypes[index] || null,
      sizeBytes: uploadedMediaSizeBytes[index] || null
    }));

    for (const [index, directUpload] of directUploads.entries()) {
      const { error: mediaError } = await admin.from("post_media").insert({
        post_id: post.id,
        storage_path: directUpload.storagePath,
        storage_provider: directUpload.provider,
        storage_bucket: directUpload.bucket,
        storage_object_key: directUpload.objectKey,
        mime_type: directUpload.mimeType,
        size_bytes: directUpload.sizeBytes,
        media_type: directUpload.mediaType,
        sort_order: index
      });

      if (mediaError) {
        await cleanupOrphanedStorage(admin);
        return NextResponse.json(
          { error: humanizeStorageError(mediaError.message) },
          { status: 500 }
        );
      }
    }

    for (const [offset, file] of mediaFiles.entries()) {
      const uploaded = await uploadPostMedia(file, `posts/${post.id}`);
      const mediaType = getUploadMediaType(file);

      const { error: mediaError } = await admin.from("post_media").insert({
        post_id: post.id,
        storage_path: uploaded.storagePath,
        storage_provider: uploaded.provider,
        storage_bucket: uploaded.bucket,
        storage_object_key: uploaded.objectKey,
        mime_type: uploaded.contentType,
        size_bytes: uploaded.sizeBytes,
        media_type: mediaType,
        sort_order: directUploads.length + offset
      });

      if (mediaError) {
        await cleanupOrphanedStorage(admin);
        return NextResponse.json(
          { error: humanizeStorageError(mediaError.message) },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? humanizeStorageError(error.message) : "Ошибка загрузки."
      },
      { status: 500 }
    );
  }
}
