import "server-only";
import { randomUUID } from "crypto";
import sharp from "sharp";
import heicConvert from "heic-convert";
import {
  MAX_AUDIO_BYTES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  inspectUploadBytes
} from "@/lib/security/file-uploads";
import {
  copyR2Object,
  deleteR2Object,
  getR2ObjectBuffer,
  getR2ObjectHead,
  toR2StoragePath,
  uploadMediaToR2
} from "@/lib/storage/media";

const SIGNATURE_BYTES = 64 * 1024;
export const MAX_BUFFERED_UPLOAD_BYTES = 4 * 1024 * 1024;

function maxBytesFor(mediaType: "image" | "video" | "audio") {
  return mediaType === "image" ? MAX_IMAGE_BYTES : mediaType === "video" ? MAX_VIDEO_BYTES : MAX_AUDIO_BYTES;
}

function finalKey(kind: string, extension: string) {
  return kind === "thumbnail"
    ? `thumbnails/${randomUUID()}.${extension}`
    : `posts/pending/${randomUUID()}.${extension}`;
}

export async function finalizePendingUpload({
  pendingKey,
  originalName,
  claimedType,
  claimedSize,
  kind
}: {
  pendingKey: string;
  originalName: string;
  claimedType: string;
  claimedSize: number;
  kind: string;
}) {
  if (!pendingKey.startsWith("uploads/pending/") || pendingKey.includes("..") || pendingKey.includes("\\")) {
    throw new Error("Некорректный путь загруженного файла.");
  }

  try {
    const [signature, head] = await Promise.all([
      getR2ObjectBuffer(pendingKey, `bytes=0-${SIGNATURE_BYTES - 1}`),
      getR2ObjectHead(pendingKey)
    ]);
    const inspected = await inspectUploadBytes(signature, { name: originalName, type: claimedType });

    if (kind === "thumbnail" && inspected.mediaType !== "image") {
      throw new Error("Для обложки можно загрузить только изображение.");
    }

    const actualSize = head.ContentLength ?? claimedSize;
    const maxBytes = maxBytesFor(inspected.mediaType);
    if (!Number.isFinite(actualSize) || actualSize <= 0 || actualSize > maxBytes) {
      throw new Error(`Файл слишком большой. Лимит: ${Math.round(maxBytes / 1024 / 1024)} MB.`);
    }

    let destinationKey = finalKey(kind, inspected.extension);
    let contentType = inspected.mimeType;
    let sizeBytes = actualSize;
    let width: number | null = null;
    let height: number | null = null;

    if (inspected.mediaType === "image") {
      try {
        const source = await getR2ObjectBuffer(pendingKey);
        const displaySource = inspected.isHeic
          ? Buffer.from(await heicConvert({ buffer: source, format: "JPEG", quality: 0.88 }))
          : source;
        const image = sharp(displaySource, { animated: inspected.mimeType === "image/gif" });
        const metadata = await image.metadata();
        width = metadata.width ?? null;
        height = metadata.height ?? null;

        let output: Buffer = displaySource;
        if (inspected.isHeic) {
          output = await image.rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
          destinationKey = finalKey(kind, "jpg");
          contentType = "image/jpeg";
          const convertedMetadata = await sharp(output).metadata();
          width = convertedMetadata.width ?? width;
          height = convertedMetadata.height ?? height;
        }

        const uploaded = await uploadMediaToR2(output, destinationKey, contentType, {
          ...(width ? { width: String(width) } : {}),
          ...(height ? { height: String(height) } : {}),
          source_format: inspected.isHeic ? inspected.mimeType : contentType
        });
        sizeBytes = uploaded.sizeBytes;
      } catch {
        throw new Error(
          inspected.isHeic
            ? "Не удалось преобразовать HEIC/HEIF. Попробуй другое фото или экспортируй его как JPG."
            : "Не удалось безопасно обработать изображение."
        );
      }
    } else {
      await copyR2Object(pendingKey, destinationKey, contentType, {
        source_format: contentType
      });
    }

    return {
      provider: "r2" as const,
      objectKey: destinationKey,
      storagePath: toR2StoragePath(destinationKey),
      contentType,
      sizeBytes,
      mediaType: inspected.mediaType,
      width,
      height,
      converted: inspected.isHeic
    };
  } finally {
    await deleteR2Object(pendingKey).catch(() => undefined);
  }
}

export async function uploadValidatedFileToR2(
  file: File,
  folder: string,
  {
    allowImages = true,
    allowVideos = true,
    allowAudio = false
  }: {
    allowImages?: boolean;
    allowVideos?: boolean;
    allowAudio?: boolean;
  } = {}
) {
  if (file.size > MAX_BUFFERED_UPLOAD_BYTES) {
    throw new Error("Большой файл нужно загрузить напрямую в защищённое хранилище.");
  }

  const source = Buffer.from(await file.arrayBuffer());
  const inspected = await inspectUploadBytes(source, file);
  const allowed =
    (inspected.mediaType === "image" && allowImages) ||
    (inspected.mediaType === "video" && allowVideos) ||
    (inspected.mediaType === "audio" && allowAudio);

  if (!allowed) {
    throw new Error("Можно загрузить только поддерживаемое фото, видео или аудио.");
  }

  const maxBytes = maxBytesFor(inspected.mediaType);
  if (source.byteLength > maxBytes) {
    throw new Error(`Файл слишком большой. Лимит: ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }

  let output: Buffer = source;
  let extension = inspected.extension;
  let contentType = inspected.mimeType;
  let width: number | null = null;
  let height: number | null = null;

  if (inspected.mediaType === "image") {
    try {
      output = inspected.isHeic
        ? Buffer.from(await heicConvert({ buffer: source, format: "JPEG", quality: 0.88 }))
        : source;
      const image = sharp(output, { animated: inspected.mimeType === "image/gif" });
      const metadata = await image.metadata();
      width = metadata.width ?? null;
      height = metadata.height ?? null;

      if (inspected.isHeic) {
        output = await image.rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
        extension = "jpg";
        contentType = "image/jpeg";
      }
    } catch {
      throw new Error(
        inspected.isHeic
          ? "Не удалось преобразовать HEIC/HEIF. Попробуй другое фото или экспортируй его как JPG."
          : "Не удалось безопасно обработать изображение."
      );
    }
  }

  const key = `${folder.replace(/^\/+|\/+$/g, "")}/${randomUUID()}.${extension}`;
  const uploaded = await uploadMediaToR2(output, key, contentType, {
    ...(width ? { width: String(width) } : {}),
    ...(height ? { height: String(height) } : {}),
    source_format: inspected.mimeType
  });

  return {
    ...uploaded,
    mediaType: inspected.mediaType,
    width,
    height,
    converted: inspected.isHeic
  };
}
