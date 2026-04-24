"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Tier } from "@/lib/types";
import { TIER_ACCESS_HINTS, TIER_LABELS } from "@/lib/utils/tier";

type UploadState = "idle" | "uploading" | "success" | "error";

const emotionOptions = ["❤️", "💋", "✨", "🔥", "🥀", "😭", "🫀", "🥹", "😈", "🖤"];

export function PostCreateForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");
  const [selectedTier, setSelectedTier] = useState<Tier>("tier_1");
  const [showEmotions, setShowEmotions] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const xhr = new XMLHttpRequest();

    setStatus("uploading");
    setProgress(0);
    setMessage("Загрузка началась...");

    xhr.upload.addEventListener("progress", (progressEvent) => {
      if (!progressEvent.lengthComputable) {
        return;
      }

      const nextProgress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
      setProgress(nextProgress);
      setMessage(`Загрузка: ${nextProgress}%`);
    });

    xhr.addEventListener("load", () => {
      try {
        const response = JSON.parse(xhr.responseText || "{}") as {
          error?: string;
          success?: boolean;
        };

        if (xhr.status >= 200 && xhr.status < 300 && response.success) {
          setStatus("success");
          setProgress(100);
          setMessage("Пост успешно создан.");
          formRef.current?.reset();
          setSelectedTier("tier_1");
          setShowEmotions(false);
          router.refresh();
          return;
        }

        setStatus("error");
        setMessage(response.error || "Не удалось создать пост.");
      } catch {
        setStatus("error");
        setMessage("Сервер вернул непонятный ответ.");
      }
    });

    xhr.addEventListener("error", () => {
      setStatus("error");
      setMessage("Ошибка сети при загрузке файла.");
    });

    xhr.open("POST", "/api/admin/posts");
    xhr.send(formData);
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
  }

  const imageAccept = ".jpg,.jpeg,.png,.webp,.gif,.avif,image/*";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-6 grid gap-4">
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
          <input name="thumbnail" type="file" accept={imageAccept} />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">Media files (можно несколько)</label>
        <input name="media" type="file" multiple />
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
