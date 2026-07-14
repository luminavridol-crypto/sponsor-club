import { MediaType } from "@/lib/types";

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/3gpp",
  "video/3gpp2"
]);
const AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/3gpp"
]);

const EXTENSIONS_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
  "video/3gpp": "3gp",
  "video/3gpp2": "3g2",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/3gpp": "3gp"
};

const ALLOWED_EXTENSIONS = new Set(Object.values(EXTENSIONS_BY_TYPE));
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v", "3gp", "3g2"]);
const AUDIO_EXTENSIONS = new Set(["webm", "ogg", "m4a", "mp3", "wav", "3gp"]);

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

export function getMimeTypeFromFileName(fileName: string) {
  const extension = getExtensionFromName(fileName);

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "mov":
      return "video/quicktime";
    case "m4v":
      return "video/x-m4v";
    case "3gp":
      return "video/3gpp";
    case "3g2":
      return "video/3gpp2";
    case "ogg":
      return "audio/ogg";
    case "m4a":
      return "audio/mp4";
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    default:
      return "";
  }
}

function isImageUpload(file: Pick<File, "type" | "name">) {
  const extension = getExtensionFromName(file.name);
  return file.type ? IMAGE_TYPES.has(file.type) : IMAGE_EXTENSIONS.has(extension);
}

function isVideoUpload(file: Pick<File, "type" | "name">) {
  const extension = getExtensionFromName(file.name);
  return file.type ? VIDEO_TYPES.has(file.type) : VIDEO_EXTENSIONS.has(extension);
}

function isAudioUpload(file: Pick<File, "type" | "name">) {
  const extension = getExtensionFromName(file.name);
  return file.type ? AUDIO_TYPES.has(file.type) : AUDIO_EXTENSIONS.has(extension);
}

export function getUploadMediaType(file: File): MediaType {
  if (isAudioUpload(file)) return "audio";
  return isVideoUpload(file) ? "video" : "image";
}

export function assertUploadFile(
  file: File,
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
  const isImage = isImageUpload(file);
  const isVideo = isVideoUpload(file);
  const isAudio = isAudioUpload(file);

  if ((!allowImages || !isImage) && (!allowVideos || !isVideo) && (!allowAudio || !isAudio)) {
    throw new Error("Можно загрузить только поддерживаемое фото, видео или аудио.");
  }

  const maxBytes = isAudio ? MAX_AUDIO_BYTES : isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  const label = isAudio ? "Аудио" : isVideo ? "Видео" : "Фото";

  if (file.size > maxBytes) {
    throw new Error(`${label} слишком большое. Лимит: ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }

  return isAudio ? "audio" : isVideo ? "video" : "image";
}
