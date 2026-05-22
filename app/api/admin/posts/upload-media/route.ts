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
  createR2SignedUploadUrl,
  toR2StoragePath,
  uploadMediaToR2
} from "@/lib/storage/media";

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
