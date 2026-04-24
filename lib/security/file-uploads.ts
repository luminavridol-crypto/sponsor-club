import { MediaType } from "@/lib/types";

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const EXTENSIONS_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov"
};

const ALLOWED_EXTENSIONS = new Set(Object.values(EXTENSIONS_BY_TYPE));

function getExtensionFromName(fileName: string) {
  return fileName.split(".").pop()?.trim().toLowerCase() ?? "";
}

export function getSafeFileExtension(file: File) {
  const typeExtension = EXTENSIONS_BY_TYPE[file.type];
  const nameExtension = getExtensionFromName(file.name);

  if (typeExtension) {
    return typeExtension;
  }

  return ALLOWED_EXTENSIONS.has(nameExtension) ? nameExtension : "bin";
}

export function getUploadMediaType(file: File): MediaType {
  return VIDEO_TYPES.has(file.type) ? "video" : "image";
}

export function assertUploadFile(
  file: File,
  {
    allowImages = true,
    allowVideos = true
  }: {
    allowImages?: boolean;
    allowVideos?: boolean;
  } = {}
) {
  const isImage = IMAGE_TYPES.has(file.type);
  const isVideo = VIDEO_TYPES.has(file.type);

  if ((!allowImages || !isImage) && (!allowVideos || !isVideo)) {
    throw new Error("Можно загрузить только JPG, PNG, WEBP, GIF, MP4, WEBM или MOV.");
  }

  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  const label = isVideo ? "Видео" : "Фото";

  if (file.size > maxBytes) {
    throw new Error(`${label} слишком большое. Лимит: ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }

  return isVideo ? "video" : "image";
}
