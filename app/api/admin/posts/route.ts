import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireActiveAdminSession } from "@/lib/auth/admin-session";
import { cleanupOrphanedStorage } from "@/lib/data/storage-cleanup";
import { getPostEmailRecipients } from "@/lib/email/recipients";
import { sendEmailCampaign } from "@/lib/email/service";
import { assertUploadFile, getSafeFileExtension, getUploadMediaType } from "@/lib/security/file-uploads";
import { R2_PROVIDER, toR2ObjectKey, uploadMediaToR2 } from "@/lib/storage/media";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { notifyTelegramUsersAboutNewPost } from "@/lib/telegram/notifications";
import { PostStatus, PostType, Tier } from "@/lib/types";
import { buildContentSlug } from "@/lib/utils/content-space";

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

type EmailCampaignResultPayload = {
  enabled: boolean;
  sentCount: number;
  failedCount: number;
  skippedReason?: string | null;
};

type TelegramCampaignResultPayload = {
  enabled: boolean;
  sentCount: number;
  failedCount: number;
  skippedReason?: string | null;
};

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
    const profile = await requireActiveAdminSession();

    if (!profile) {
      return NextResponse.json({ error: "Нужно войти в аккаунт." }, { status: 401 });
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
    const sendEmailCampaignNow = formData.get("sendEmailCampaign") === "on";
    const emailSubject = formValue(formData.get("emailSubject"));
    const emailBody = formValue(formData.get("emailBody"));
    const status = formValue(formData.get("status")) as PostStatus;
    const requiredTier = formValue(formData.get("requiredTier")) as Tier;
    const postType = formValue(formData.get("postType")) as PostType;
    const body = formValue(formData.get("body")) || null;

    const slug = buildContentSlug(title);
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
    const isSellable = formValue(formData.get("isSellable")) === "on";
    const salePrice = isSellable ? Number(formValue(formData.get("salePrice"))) || 0 : 0;

    if (isSellable && salePrice <= 0) {
      return NextResponse.json({ error: "Укажи цену для платного поста." }, { status: 400 });
    }

    if (postType === "text" && !body) {
      return NextResponse.json({ error: "Добавь текст публикации, чтобы создать текстовый пост." }, { status: 400 });
    }

    if (thumbnailFile instanceof File && thumbnailFile.size > 0) {
      const uploaded = await uploadFile(thumbnailFile, "thumbnails");
      thumbnailPath = uploaded.storagePath;
      thumbnailProvider = uploaded.provider;
      thumbnailBucket = uploaded.bucket;
      thumbnailObjectKey = uploaded.objectKey;
      thumbnailMimeType = uploaded.contentType;
      thumbnailSizeBytes = uploaded.sizeBytes;
    }

    const postPayload = {
      title,
      slug,
      description: formValue(formData.get("description")) || null,
      body,
      post_type: postType,
      required_tier: requiredTier,
      status,
      publish_at: publishAt,
      retention_days: retentionDays || null,
      expires_at: expiresAt,
      thumbnail_path: thumbnailPath,
      thumbnail_provider: thumbnailProvider || (thumbnailPath ? R2_PROVIDER : null),
      thumbnail_bucket: thumbnailBucket,
      thumbnail_object_key: thumbnailObjectKey || (thumbnailPath ? toR2ObjectKey(thumbnailPath) : null),
      thumbnail_mime_type: thumbnailMimeType,
      thumbnail_size_bytes: thumbnailSizeBytes,
      is_sellable: isSellable,
      sale_price: isSellable ? Number(salePrice.toFixed(2)) : null,
      author_id: profile.id
    };

    const insertPost = async (payload: Record<string, unknown>) =>
      admin.from("posts").insert(payload).select("id").single();

    let { data: post, error } = await insertPost(postPayload);

    if (
      error?.message?.includes("posts.is_sellable") ||
      error?.message?.includes("posts.sale_price")
    ) {
      const legacyPostPayload = { ...postPayload } as Record<string, unknown>;
      delete legacyPostPayload.is_sellable;
      delete legacyPostPayload.sale_price;
      ({ data: post, error } = await insertPost(legacyPostPayload));
    }

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
        return NextResponse.json({ error: humanizeStorageError(mediaError.message) }, { status: 500 });
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
        return NextResponse.json({ error: humanizeStorageError(mediaError.message) }, { status: 500 });
      }
    }

    const emailCampaign: EmailCampaignResultPayload = {
      enabled: false,
      sentCount: 0,
      failedCount: 0
    };
    const telegramCampaign: TelegramCampaignResultPayload = {
      enabled: false,
      sentCount: 0,
      failedCount: 0
    };

    if (sendEmailCampaignNow) {
      emailCampaign.enabled = true;

      if (status !== "published") {
        emailCampaign.skippedReason = "пост ещё не опубликован";
      } else if (!emailSubject || !emailBody) {
        emailCampaign.skippedReason = "не заполнены тема или текст письма";
      } else {
        const recipients = await getPostEmailRecipients(requiredTier);

        if (!recipients.length) {
          emailCampaign.skippedReason = "не найдено получателей";
        } else {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "http://localhost:3000";
          const result = await sendEmailCampaign({
            kind: "post",
            title: `Пост: ${title}`,
            subject: emailSubject,
            body: emailBody,
            postId: post.id,
            targetScope: "eligible_post_members",
            targetTiers: [requiredTier],
            createdBy: profile.id,
            recipients,
            metadata: {
              post_slug: slug,
              post_title: title,
              post_url: `${siteUrl}/club/${slug}`,
              publish_at: publishAt,
              automatic_from_post_create: true
            }
          });

          emailCampaign.sentCount = result.sentCount;
          emailCampaign.failedCount = result.failedCount;
        }
      }
    }

    if (status === "published") {
      telegramCampaign.enabled = true;
      const result = await notifyTelegramUsersAboutNewPost({
        postTitle: title,
        postSlug: slug,
        requiredTier
      });
      telegramCampaign.sentCount = result.sentCount;
      telegramCampaign.failedCount = result.failedCount;
    } else {
      telegramCampaign.skippedReason = "пост ещё не опубликован";
    }

    return NextResponse.json({ success: true, emailCampaign, telegramCampaign });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? humanizeStorageError(error.message) : "Ошибка загрузки."
      },
      { status: 500 }
    );
  }
}
