import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireActiveAdminSession } from "@/lib/auth/admin-session";
import { getR2Env } from "@/lib/r2/env";
import {
  assertUploadFile,
  getMimeTypeFromFileName,
  getSafeFileExtension
} from "@/lib/security/file-uploads";
import { assertSameOriginRequest, isInvalidRequestOriginError } from "@/lib/security/request-origin";
import {
  createR2SignedUploadUrl,
  toR2StoragePath,
  uploadMediaToR2
} from "@/lib/storage/media";
import { createUploadWorkerToken, getUploadWorkerEnv } from "@/lib/upload-worker/token";
import { finalizePendingUpload, MAX_BUFFERED_UPLOAD_BYTES } from "@/lib/media/process-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function buildKey(kind: string, extension: string) {
  return `uploads/pending/${kind === "thumbnail" ? "thumbnail-" : "media-"}${randomUUID()}.${extension}`;
}

export async function POST(request: Request) {
  try {
    await assertSameOriginRequest();
    const profile = await requireActiveAdminSession();

    if (!profile) {
      return NextResponse.json({ error: "Нужно войти в аккаунт." }, { status: 401 });
    }

    const formData = await request.formData();
    const kind = formValue(formData.get("kind")) || "media";
    const mode = formValue(formData.get("mode")) || "direct";
    const { bucketName } = getR2Env();

    if (mode === "finalize") {
      const pendingKey = formValue(formData.get("objectKey"));
      const fileName = formValue(formData.get("fileName"));
      const fileType = formValue(formData.get("fileType"));
      const fileSize = Number(formValue(formData.get("fileSize")) || 0);

      if (!pendingKey || !fileName || fileSize <= 0) {
        return NextResponse.json({ error: "Данные загруженного файла неполные." }, { status: 400 });
      }

      const finalized = await finalizePendingUpload({
        pendingKey,
        originalName: fileName,
        claimedType: fileType,
        claimedSize: fileSize,
        kind
      });

      return NextResponse.json({
        provider: finalized.provider,
        bucket: bucketName,
        object_key: finalized.objectKey,
        storage_path: finalized.storagePath,
        mime_type: finalized.contentType,
        size_bytes: finalized.sizeBytes,
        media_type: finalized.mediaType,
        width: finalized.width,
        height: finalized.height,
        converted: finalized.converted
      });
    }

    if (mode === "direct") {
      const fileName = formValue(formData.get("fileName"));
      const fileType = formValue(formData.get("fileType"));
      const fileSize = Number(formValue(formData.get("fileSize")) || 0);

      if (!fileName || fileSize <= 0) {
        return NextResponse.json({ error: "Файл не найден." }, { status: 400 });
      }

      const pseudoFile = { name: fileName, type: fileType, size: fileSize } as File;
      const mediaType =
        kind === "thumbnail"
          ? assertUploadFile(pseudoFile, { allowImages: true, allowVideos: false })
          : assertUploadFile(pseudoFile, { allowAudio: true });
      const extension = getSafeFileExtension(pseudoFile);
      const contentType = fileType || getMimeTypeFromFileName(fileName) || "application/octet-stream";
      const key = buildKey(kind, extension);
      const uploadUrl = await createR2SignedUploadUrl(key, contentType);

      return NextResponse.json({
        provider: "r2",
        bucket: bucketName,
        object_key: key,
        storage_path: toR2StoragePath(key),
        mime_type: contentType,
        size_bytes: fileSize,
        media_type: mediaType,
        upload_url: uploadUrl,
        upload_method: "PUT"
      });
    }

    if (mode === "multipart-start") {
      const fileName = formValue(formData.get("fileName"));
      const fileType = formValue(formData.get("fileType"));
      const fileSize = Number(formValue(formData.get("fileSize")) || 0);

      if (!fileName || fileSize <= 0) {
        return NextResponse.json({ error: "Файл не найден." }, { status: 400 });
      }

      const pseudoFile = { name: fileName, type: fileType, size: fileSize } as File;
      const mediaType =
        kind === "thumbnail"
          ? assertUploadFile(pseudoFile, { allowImages: true, allowVideos: false })
          : assertUploadFile(pseudoFile, { allowAudio: true });
      const extension = getSafeFileExtension(pseudoFile);
      const contentType = fileType || getMimeTypeFromFileName(fileName) || "application/octet-stream";
      const key = buildKey(kind, extension);
      const workerEnv = getUploadWorkerEnv();
      const workerToken = workerEnv.enabled
        ? createUploadWorkerToken(
            {
              objectKey: key,
              exp: Math.floor(Date.now() / 1000) + 60 * 30
            },
            workerEnv.tokenSecret
          )
        : null;

      return NextResponse.json({
        provider: "r2",
        bucket: bucketName,
        object_key: key,
        storage_path: toR2StoragePath(key),
        mime_type: contentType,
        size_bytes: fileSize,
        media_type: mediaType,
        upload_id: null,
        worker_create_url: workerEnv.enabled ? `${workerEnv.publicUrl}/multipart/create` : null,
        worker_upload_url: workerEnv.enabled ? `${workerEnv.publicUrl}/multipart/part` : null,
        worker_complete_url: workerEnv.enabled ? `${workerEnv.publicUrl}/multipart/complete` : null,
        worker_abort_url: workerEnv.enabled ? `${workerEnv.publicUrl}/multipart/abort` : null,
        worker_token: workerToken
      });
    }

    const file = formData.get("file");

    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "Файл не найден." }, { status: 400 });
    }

    if (file.size > MAX_BUFFERED_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Большой файл нужно загрузить напрямую в защищённое хранилище." },
        { status: 413 }
      );
    }

    if (kind === "thumbnail") {
      assertUploadFile(file, { allowImages: true, allowVideos: false });
    } else {
      assertUploadFile(file, { allowAudio: true });
    }
    const extension = getSafeFileExtension(file);
    const key = buildKey(kind, extension);
    const contentType = file.type || getMimeTypeFromFileName(file.name) || "application/octet-stream";
    await uploadMediaToR2(file, key, contentType);
    const finalized = await finalizePendingUpload({
      pendingKey: key,
      originalName: file.name,
      claimedType: file.type,
      claimedSize: file.size,
      kind
    });

    return NextResponse.json({
      provider: "r2",
      bucket: bucketName,
      object_key: finalized.objectKey,
      storage_path: finalized.storagePath,
      mime_type: finalized.contentType,
      size_bytes: finalized.sizeBytes,
      media_type: finalized.mediaType,
      width: finalized.width,
      height: finalized.height,
      converted: finalized.converted
    });
  } catch (error) {
    if (isInvalidRequestOriginError(error)) {
      return NextResponse.json({ error: "Недопустимый источник запроса." }, { status: 403 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ошибка загрузки файла."
      },
      { status: error instanceof Error && /неподдерживаем|небезопас|слишком больш|не удалось определить|только изображение/i.test(error.message) ? 400 : 500 }
    );
  }
}
