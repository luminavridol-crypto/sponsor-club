"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Tier } from "@/lib/types";
import { TIER_ACCESS_HINTS, TIER_LABELS } from "@/lib/utils/tier";

type UploadState = "idle" | "uploading" | "success" | "error";
type UploadKind = "thumbnail" | "media";

type UploadPreparationItem = {
  fileName: string;
  contentType: string;
  kind: UploadKind;
};

type UploadResponseItem = UploadPreparationItem & {
  mediaType: "image" | "video";
  storagePath: string;
  uploadMethod: "supabase" | "r2";
  token?: string;
  signedUrl?: string;
  uploadPath?: string;
};

const emotionOptions = ["❤️", "💋", "✨", "🔥", "🥂", "😵", "🫦", "🥹", "😀", "🖤"];

const defaultPreview = {
  title: "Lumina Exclusive Drop",
  postType: "announcement",
  status: "published",
  description: "",
  body: ""
};

export function PostCreateForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");
  const [selectedTier, setSelectedTier] = useState<Tier>("tier_1");
  const [showEmotions, setShowEmotions] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [mediaNames, setMediaNames] = useState<string[]>([]);
  const [preview, setPreview] = useState(defaultPreview);

  useEffect(() => {
    return () => {
      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  function refreshPreview(form: HTMLFormElement) {
    const formData = new FormData(form);
    setPreview({
      title: String(formData.get("title") || "Новый пост"),
      postType: String(formData.get("postType") || "announcement"),
      status: String(formData.get("status") || "draft"),
      description: String(formData.get("description") || ""),
      body: String(formData.get("body") || "")
    });
  }

  async function prepareUploads(files: UploadPreparationItem[]) {
    const response = await fetch("/api/admin/posts/upload-urls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ files })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      items?: UploadResponseItem[];
    };

    if (!response.ok) {
      throw new Error(payload.error || "Не удалось подготовить загрузку файлов.");
    }

    return Array.isArray(payload.items) ? payload.items : [];
  }

  async function uploadPreparedFile(file: File, prepared: UploadResponseItem) {
    if (prepared.uploadMethod === "supabase") {
      if (!prepared.token || !prepared.uploadPath) {
        throw new Error("Сервер не вернул данные для загрузки изображения.");
      }

      const supabase = createClient();
      const { error } = await supabase.storage
        .from("post-media")
        .uploadToSignedUrl(prepared.uploadPath, prepared.token, file, {
          contentType: file.type || prepared.contentType
        });

      if (error) {
        throw new Error(error.message || "Не удалось загрузить файл в хранилище.");
      }

      return;
    }

    if (!prepared.signedUrl) {
      throw new Error("Сервер не вернул ссылку для загрузки видео.");
    }

    const response = await fetch(prepared.signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || prepared.contentType
      },
      body: file
    });

    if (!response.ok) {
      throw new Error("Не удалось загрузить видео в хранилище.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus("uploading");
    setProgress(0);
    setMessage("Подготавливаю загрузку...");

    try {
      const formData = new FormData(event.currentTarget);
      const thumbnailFile = formData.get("thumbnail");
      const mediaFiles = formData
        .getAll("media")
        .filter((item): item is File => item instanceof File && item.size > 0);
      const uploadFiles: Array<{ file: File; kind: UploadKind }> = [];

      if (thumbnailFile instanceof File && thumbnailFile.size > 0) {
        uploadFiles.push({ file: thumbnailFile, kind: "thumbnail" });
      }

      uploadFiles.push(...mediaFiles.map((file) => ({ file, kind: "media" as const })));

      const preparedUploads = uploadFiles.length
        ? await prepareUploads(
            uploadFiles.map(({ file, kind }) => ({
              fileName: file.name,
              contentType: file.type,
              kind
            }))
          )
        : [];

      const thumbnailPath = preparedUploads.find((item) => item.kind === "thumbnail")?.storagePath;
      const mediaEntries: Array<{ path: string; mediaType: "image" | "video" }> = [];

      for (let index = 0; index < uploadFiles.length; index += 1) {
        const current = uploadFiles[index];
        const prepared = preparedUploads[index];

        if (!current || !prepared) {
          throw new Error("Сервер вернул неполный набор данных для загрузки.");
        }

        setMessage(`Загружаю файлы: ${index + 1} из ${uploadFiles.length}`);
        await uploadPreparedFile(current.file, prepared);

        if (prepared.kind === "media") {
          mediaEntries.push({
            path: prepared.storagePath,
            mediaType: prepared.mediaType
          });
        }

        setProgress(Math.round(((index + 1) / Math.max(uploadFiles.length, 1)) * 90));
      }

      formData.delete("thumbnail");
      formData.delete("media");

      if (thumbnailPath) {
        formData.set("uploadedThumbnailPath", thumbnailPath);
      }

      mediaEntries.forEach((entry) => {
        formData.append("uploadedMediaPath", entry.path);
        formData.append("uploadedMediaType", entry.mediaType);
      });

      setMessage("Сохраняю пост...");

      const response = await fetch("/api/admin/posts", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
      };

      if (!response.ok || !payload.success) {
        if (response.status === 413) {
          throw new Error("Файл оказался слишком большим для текущих ограничений сервера.");
        }

        throw new Error(payload.error || "Не удалось создать пост.");
      }

      setStatus("success");
      setProgress(100);
      setMessage("Пост успешно создан.");
      formRef.current?.reset();
      setPreview(defaultPreview);
      setThumbnailPreview((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return null;
      });
      setMediaNames([]);
      setSelectedTier("tier_1");
      setShowEmotions(false);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Не удалось загрузить файлы и создать пост."
      );
    }
  }

  function insertEmotion(emoji: string) {
    const textarea = descriptionRef.current;

    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const prefix = textarea.value.slice(0, start);
    const suffix = textarea.value.slice(end);
    const beforeSpacer = prefix && !prefix.endsWith(" ") && !prefix.endsWith("\n") ? " " : "";
    const afterSpacer = suffix && !suffix.startsWith(" ") && !suffix.startsWith("\n") ? " " : "";

    textarea.value = `${prefix}${beforeSpacer}${emoji}${afterSpacer}${suffix}`;
    textarea.focus();

    const caretPosition = prefix.length + beforeSpacer.length + emoji.length + afterSpacer.length;
    textarea.setSelectionRange(caretPosition, caretPosition);

    if (formRef.current) {
      refreshPreview(formRef.current);
    }
  }

  const imageAccept = ".jpg,.jpeg,.png,.webp,.gif,.avif,image/*";
  const mediaAccept = ".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov,image/*,video/*";

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onChange={(event) => refreshPreview(event.currentTarget)}
      className="mt-6 grid gap-4"
      encType="multipart/form-data"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-white/60">Название</label>
          <input name="title" defaultValue="Lumina Exclusive Drop" required />
        </div>
        <div>
          <label className="mb-2 block text-sm text-white/60">Тип</label>
          <select name="postType" defaultValue="announcement">
            <option value="announcement">announcement</option>
            <option value="text">text</option>
            <option value="gallery">gallery</option>
            <option value="video">video</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-white/60">Для кого этот пост</label>
          <select
            name="requiredTier"
            value={selectedTier}
            onChange={(event) => setSelectedTier(event.target.value as Tier)}
          >
            <option value="tier_1">{TIER_LABELS.tier_1}</option>
            <option value="tier_2">{TIER_LABELS.tier_2}</option>
            <option value="tier_3">{TIER_LABELS.tier_3}</option>
          </select>
          <p className="mt-2 text-sm text-accentSoft">{TIER_ACCESS_HINTS[selectedTier]}</p>
        </div>
        <div>
          <label className="mb-2 block text-sm text-white/60">Статус</label>
          <select name="status" defaultValue="published">
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">Автоудаление</label>
        <select name="retentionDays" defaultValue="30">
          <option value="30">30 дней</option>
          <option value="60">60 дней</option>
          <option value="90">90 дней</option>
          <option value="0">Не удалять</option>
        </select>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="block text-sm text-white/60">Описание</label>
          <button
            type="button"
            onClick={() => setShowEmotions((value) => !value)}
            className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accentSoft transition hover:border-accent/50 hover:bg-accent/15"
          >
            Добавить эмоции
          </button>
        </div>
        <textarea ref={descriptionRef} name="description" />
        {showEmotions ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {emotionOptions.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmotion(emoji)}
                className="rounded-full border border-white/10 bg-black/10 px-3 py-2 text-lg transition hover:border-accent/35 hover:bg-white/5"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">Текст поста</label>
        <textarea name="body" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-white/60">Дата публикации</label>
          <input name="publishAt" type="datetime-local" />
        </div>
        <div>
          <label className="mb-2 block text-sm text-white/60">Thumbnail</label>
          <input
            name="thumbnail"
            type="file"
            accept={imageAccept}
            onChange={(event) => {
              const file = event.target.files?.[0];
              setThumbnailPreview((current) => {
                if (current) {
                  URL.revokeObjectURL(current);
                }

                return file ? URL.createObjectURL(file) : null;
              });
            }}
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">Media files (можно несколько)</label>
        <input
          name="media"
          type="file"
          accept={mediaAccept}
          multiple
          onChange={(event) =>
            setMediaNames(Array.from(event.target.files ?? []).map((file) => file.name))
          }
        />
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/10 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-accentSoft">Preview</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Предпросмотр поста</h3>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/50">
            {preview.status}
          </span>
        </div>
        <article className="overflow-hidden rounded-[24px] border border-white/10 bg-white/5">
          {thumbnailPreview ? (
            <img src={thumbnailPreview} alt="" className="h-52 w-full object-cover" />
          ) : null}
          <div className="border-b border-white/10 bg-gradient-to-br from-accent/10 to-cyanGlow/10 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-accentSoft">
                {preview.postType}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                {TIER_LABELS[selectedTier]}
              </span>
            </div>
            <h4 className="break-words text-xl font-semibold text-white">{preview.title}</h4>
            {preview.description ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/65">
                {preview.description}
              </p>
            ) : null}
          </div>
          <div className="space-y-3 p-4">
            {preview.body ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-white/72">{preview.body}</p>
            ) : null}
            {mediaNames.length ? (
              <div className="flex flex-wrap gap-2">
                {mediaNames.map((name) => (
                  <span
                    key={name}
                    className="max-w-full truncate rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </article>
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/10 p-4">
        <div className="mb-2 flex items-center justify-between text-sm text-white/70">
          <span>Прогресс загрузки</span>
          <span>{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all ${
              status === "error" ? "bg-rose-400" : "bg-accent"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-white/65">
          {status === "idle" ? "Пока ничего не загружается." : message}
        </p>
      </div>

      <button
        disabled={status === "uploading"}
        className="w-full rounded-2xl bg-white px-4 py-3 font-medium text-background transition hover:bg-goldSoft disabled:cursor-not-allowed disabled:opacity-70 sm:w-fit"
      >
        {status === "uploading" ? "Загружаю..." : "Создать пост"}
      </button>
    </form>
  );
}
