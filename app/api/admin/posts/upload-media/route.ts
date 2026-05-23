import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireActiveAdminSession } from "@/lib/auth/admin-session";
import { getR2Env } from "@/lib/r2/env";
import {
  assertUploadFile,
  getMimeTypeFromFileName,
  getSafeFileExtension
} from "@/lib/security/file-uploads";
import {
  abortR2MultipartUpload,
  completeR2MultipartUpload,
  createR2MultipartUpload,
  createR2SignedUploadUrl,
  toR2StoragePath,
  uploadR2MultipartPart,
  uploadMediaToR2
} from "@/lib/storage/media";
import { createUploadWorkerToken, getUploadWorkerEnv } from "@/lib/upload-worker/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function buildKey(kind: string, extension: string) {
  return kind === "thumbnail"
    ? `thumbnails/${randomUUID()}.${extension}`
    : `posts/pending/${randomUUID()}.${extension}`;
}

function parseParts(raw: string) {
  const parsed = JSON.parse(raw) as Array<{ etag: string; partNumber: number }>;

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Не удалось завершить загрузку: список частей пуст.");
  }

  return parsed.map((part) => ({
    etag: String(part.etag || "").trim(),
    partNumber: Number(part.partNumber || 0)
  }));
}

export async function POST(request: Request) {
  try {
    const profile = await requireActiveAdminSession();

    if (!profile) {
      return NextResponse.json({ error: "Нужно войти в аккаунт." }, { status: 401 });
    }

    const formData = await request.formData();
    const kind = formValue(formData.get("kind")) || "media";
    const mode = formValue(formData.get("mode")) || "direct";
    const { bucketName } = getR2Env();

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
          : assertUploadFile(pseudoFile);
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
          : assertUploadFile(pseudoFile);
      const extension = getSafeFileExtension(pseudoFile);
      const contentType = fileType || getMimeTypeFromFileName(fileName) || "application/octet-stream";
      const key = buildKey(kind, extension);
      const multipart = await createR2MultipartUpload(key, contentType);
      const workerEnv = getUploadWorkerEnv();
      const workerToken = workerEnv.enabled
        ? createUploadWorkerToken(
            {
              objectKey: multipart.objectKey,
              uploadId: multipart.uploadId,
              exp: Math.floor(Date.now() / 1000) + 60 * 30
            },
            workerEnv.tokenSecret
          )
        : null;

      return NextResponse.json({
        provider: "r2",
        bucket: bucketName,
        object_key: multipart.objectKey,
        storage_path: toR2StoragePath(multipart.objectKey),
        mime_type: contentType,
        size_bytes: fileSize,
        media_type: mediaType,
        upload_id: multipart.uploadId,
        worker_upload_url: workerEnv.enabled ? `${workerEnv.publicUrl}/multipart/part` : null,
        worker_token: workerToken
      });
    }

    if (mode === "multipart-part") {
      const uploadId = formValue(formData.get("uploadId"));
      const objectKey = formValue(formData.get("objectKey"));
      const partNumber = Number(formValue(formData.get("partNumber")) || 0);
      const chunk = formData.get("chunk");

      if (!uploadId || !objectKey || partNumber <= 0 || !(chunk instanceof File) || chunk.size <= 0) {
        return NextResponse.json({ error: "Не удалось загрузить chunk." }, { status: 400 });
      }

      const buffer = Buffer.from(await chunk.arrayBuffer());
      const uploadedPart = await uploadR2MultipartPart({
        key: objectKey,
        uploadId,
        partNumber,
        body: buffer,
        contentLength: buffer.byteLength
      });

      return NextResponse.json({
        ok: true,
        part_number: uploadedPart.partNumber,
        etag: uploadedPart.etag
      });
    }

    if (mode === "multipart-complete") {
      const uploadId = formValue(formData.get("uploadId"));
      const objectKey = formValue(formData.get("objectKey"));
      const mimeType = formValue(formData.get("mimeType")) || "application/octet-stream";
      const sizeBytes = Number(formValue(formData.get("fileSize")) || 0);
      const mediaType = formValue(formData.get("mediaType")) as "image" | "video";
      const rawParts = formValue(formData.get("parts"));

      if (!uploadId || !objectKey || !rawParts) {
        return NextResponse.json({ error: "Не удалось завершить загрузку." }, { status: 400 });
      }

      const parts = parseParts(rawParts);
      const completed = await completeR2MultipartUpload({
        key: objectKey,
        uploadId,
        parts
      });

      return NextResponse.json({
        provider: "r2",
        bucket: completed.bucket,
        object_key: completed.objectKey,
        storage_path: completed.storagePath,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        media_type: mediaType
      });
    }

    if (mode === "multipart-abort") {
      const uploadId = formValue(formData.get("uploadId"));
      const objectKey = formValue(formData.get("objectKey"));

      if (!uploadId || !objectKey) {
        return NextResponse.json({ error: "Не удалось отменить загрузку." }, { status: 400 });
      }

      await abortR2MultipartUpload({
        key: objectKey,
        uploadId
      });

      return NextResponse.json({ ok: true });
    }

    const file = formData.get("file");

    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "Файл не найден." }, { status: 400 });
    }

    const mediaType =
      kind === "thumbnail"
        ? assertUploadFile(file, { allowImages: true, allowVideos: false })
        : assertUploadFile(file);
    const extension = getSafeFileExtension(file);
    const key = buildKey(kind, extension);
    const contentType = file.type || getMimeTypeFromFileName(file.name) || "application/octet-stream";
    const uploaded = await uploadMediaToR2(file, key, contentType);

    return NextResponse.json({
      provider: "r2",
      bucket: uploaded.bucket || bucketName,
      object_key: uploaded.objectKey,
      storage_path: toR2StoragePath(uploaded.objectKey),
      mime_type: uploaded.contentType,
      size_bytes: uploaded.sizeBytes,
      media_type: mediaType
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ошибка загрузки файла."
      },
      { status: 500 }
    );
  }
}
