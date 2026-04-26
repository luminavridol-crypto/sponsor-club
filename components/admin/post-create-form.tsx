"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tier } from "@/lib/types";
import { TIER_ACCESS_HINTS, TIER_LABELS } from "@/lib/utils/tier";

type UploadState = "idle" | "uploading" | "success" | "error";

type ServerUploadResponse = {
  provider: "r2";
  bucket: string;
  object_key: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  media_type: "image" | "video";
  error?: string;
};

const TARGET_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2560;
const DEFAULT_POST_TITLE = "Lumina Secret Drop";

function isCompressibleImage(file: File) {
  return file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp";
}

function replaceFileExtension(fileName: string, nextExtension: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return `${baseName}.${nextExtension}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Не удалось обработать изображение."));
          return;
        }

        resolve(blob);
      },
      "image/webp",
      quality
    );
  });
}

async function loadImageElement(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Не удалось открыть изображение."));
      element.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function compressImageFile(file: File) {
  if (!isCompressibleImage(file) || file.size <= TARGET_IMAGE_BYTES) {
    return file;
  }

  const image = await loadImageElement(file);
  let width = image.naturalWidth;
  let height = image.naturalHeight;
  const firstScale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));

  width = Math.max(1, Math.round(width * firstScale));
  height = Math.max(1, Math.round(height * firstScale));

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Не удалось подготовить сжатие изображения.");
  }

  let quality = 0.9;
  let bestBlob: Blob | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, quality);
    bestBlob = blob;

    if (blob.size <= TARGET_IMAGE_BYTES) {
      return new File([blob], replaceFileExtension(file.name, "webp"), {
        type: "image/webp",
        lastModified: file.lastModified
      });
    }

    if (quality > 0.55) {
      quality -= 0.12;
    } else {
      width = Math.max(960, Math.round(width * 0.85));
      height = Math.max(960, Math.round(height * 0.85));
    }
  }

  if (!bestBlob) {
    return file;
  }

  return new File([bestBlob], replaceFileExtension(file.name, "webp"), {
    type: "image/webp",
    lastModified: file.lastModified
  });
}

async function uploadFileThroughServer(file: File) {
  const body = new FormData();
  body.set("kind", "media");
  body.set("file", file);

  const response = await fetch("/api/admin/posts/upload-media", {
    method: "POST",
    body
  });

  const payload = (await response.json().catch(() => ({}))) as ServerUploadResponse;

  if (!response.ok) {
    throw new Error(payload.error || "Не удалось загрузить файл через сервер.");
  }

  return payload;
}

export function PostCreateForm() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadState>("idle");
  const [message, setMessage] = useState("Файлы пока не загружаются.");
  const [selectedTier, setSelectedTier] = useState<Tier>("tier_1");
  const [mediaNames, setMediaNames] = useState<string[]>([]);

  useEffect(() => {
    if (status !== "success") return;
    const timeout = window.setTimeout(() => {
      setStatus("idle");
      setMessage("Файлы пока не загружаются.");
      setProgress(0);
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus("uploading");
    setProgress(0);
    setMessage("Готовлю публикацию...");

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const mediaFiles = formData
        .getAll("media")
        .filter((item): item is File => item instanceof File && item.size > 0);
      const optimizedFiles: File[] = [];

      for (const file of mediaFiles) {
        if (file.type.startsWith("image/") && isCompressibleImage(file)) {
          setMessage(`Оптимизирую фото: ${file.name}`);
          optimizedFiles.push(await compressImageFile(file));
        } else {
          optimizedFiles.push(file);
        }
      }

      const mediaEntries: ServerUploadResponse[] = [];

      for (let index = 0; index < optimizedFiles.length; index += 1) {
        const file = optimizedFiles[index];

        setMessage(`Загружаю файл через сервер: ${index + 1} из ${optimizedFiles.length}`);
        const uploaded = await uploadFileThroughServer(file);
        mediaEntries.push(uploaded);
        setProgress(Math.round(((index + 1) / Math.max(optimizedFiles.length, 1)) * 90));
      }

      formData.delete("thumbnail");
      formData.delete("media");

      mediaEntries.forEach((entry) => {
        formData.append("uploadedMediaPath", entry.storage_path);
        formData.append("uploadedMediaType", entry.media_type);
        formData.append("uploadedMediaProvider", entry.provider);
        formData.append("uploadedMediaBucket", entry.bucket);
        formData.append("uploadedMediaObjectKey", entry.object_key);
        formData.append("uploadedMediaMimeType", entry.mime_type);
        formData.append("uploadedMediaSizeBytes", String(entry.size_bytes));
      });

      setMessage("Сохраняю публикацию...");

      const response = await fetch("/api/admin/posts", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Не удалось создать публикацию.");
      }

      setStatus("success");
      setProgress(100);
      setMessage("Публикация создана.");
      form.reset();
      setSelectedTier("tier_1");
      setMediaNames([]);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Не удалось загрузить файлы и создать публикацию."
      );
    }
  }

  const mediaAccept = ".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov,image/*,video/*";

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-3" encType="multipart/form-data">
      <input type="hidden" name="postType" value="announcement" />
      <input type="hidden" name="status" value="published" />

      <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <label className="mb-2 block text-sm text-white/60">Название</label>
          <input name="title" defaultValue={DEFAULT_POST_TITLE} required />
        </div>
        <div>
          <label className="mb-2 block text-sm text-white/60">Кому показать</label>
          <select
            name="requiredTier"
            value={selectedTier}
            onChange={(event) => setSelectedTier(event.target.value as Tier)}
          >
            <option value="tier_1">{TIER_LABELS.tier_1}</option>
            <option value="tier_2">{TIER_LABELS.tier_2}</option>
            <option value="tier_3">{TIER_LABELS.tier_3}</option>
          </select>
          <p className="mt-2 text-xs leading-5 text-accentSoft">{TIER_ACCESS_HINTS[selectedTier]}</p>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">Текст публикации</label>
        <textarea name="body" placeholder="Основной текст поста." className="min-h-[180px]" />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">Автоудаление</label>
        <select name="retentionDays" defaultValue="30">
          <option value="30">Через 30 дней</option>
          <option value="60">Через 60 дней</option>
          <option value="90">Через 90 дней</option>
          <option value="0">Не удалять автоматически</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">Фото или видео</label>
        <input
          name="media"
          type="file"
          accept={mediaAccept}
          multiple
          onChange={(event) =>
            setMediaNames(Array.from(event.target.files ?? []).map((file) => file.name))
          }
        />
        {mediaNames.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {mediaNames.map((name) => (
              <span
                key={name}
                className="max-w-full truncate rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
              >
                {name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
        <div className="mb-2 flex items-center justify-between text-sm text-white/70">
          <span>Загрузка через сервер в R2</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all ${
              status === "error" ? "bg-rose-400" : "bg-cyanGlow"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-white/65">{message}</p>
      </div>

      <button
        disabled={status === "uploading"}
        className="w-full rounded-2xl bg-white px-5 py-3 font-medium text-background transition hover:bg-goldSoft disabled:cursor-not-allowed disabled:opacity-70 sm:w-fit"
      >
        {status === "uploading" ? "Создаю публикацию..." : "Создать публикацию"}
      </button>
    </form>
  );
}
