"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type UploadState = "idle" | "uploading" | "success" | "error";

export function AdminChatComposer({
  profileId,
  memberLabel
}: {
  profileId: string;
  memberLabel: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("Файл не выбран");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const body = String(formData.get("body") ?? "").trim();
    const media = formData.get("media");
    const hasMedia = media instanceof File && media.size > 0;

    if (!body && !hasMedia) {
      setStatus("error");
      setMessage("Напиши сообщение или прикрепи фото/видео.");
      return;
    }

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
          setMessage("Сообщение отправлено.");
          formRef.current?.reset();
          setSelectedFileName("Файл не выбран");
          router.refresh();
          return;
        }

        setStatus("error");
        setMessage(response.error || "Не удалось отправить сообщение.");
      } catch {
        setStatus("error");
        setMessage("Сервер вернул непонятный ответ.");
      }
    });

    xhr.addEventListener("error", () => {
      setStatus("error");
      setMessage("Ошибка сети при отправке сообщения.");
    });

    xhr.open("POST", "/api/admin/chat");
    xhr.send(formData);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setSelectedFileName(file?.name || "Файл не выбран");

    if (!file) {
      if (status === "success") {
        setStatus("idle");
        setProgress(0);
        setMessage("");
      }
      return;
    }

    if (status !== "uploading") {
      setStatus("idle");
      setProgress(0);
      setMessage("Файл готов к отправке.");
    }
  }

  const hasProgressInfo = status !== "idle" || selectedFileName !== "Файл не выбран";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-5 space-y-4">
      <input type="hidden" name="profileId" value={profileId} />

      <div className="space-y-3 rounded-3xl border border-white/10 bg-black/10 p-4">
        <textarea
          name="body"
          placeholder={`Ответить ${memberLabel}...`}
          className="min-h-[160px]"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={status === "uploading"}
            className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accentSoft transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "uploading" ? "Отправляю..." : "Отправить ответ"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            name="media"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/80 transition hover:border-accent/30 hover:bg-white/5 hover:text-white"
          >
            Выбрать файл
          </button>

          <span className="text-sm text-white/55">{selectedFileName}</span>
        </div>

        <p className="text-xs text-white/40">
          Только ты можешь отправлять фото и видео в личный чат.
        </p>

        {hasProgressInfo ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
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
              {status === "idle" ? message || "Файл выбран и готов к отправке." : message}
            </p>
          </div>
        ) : null}
      </div>
    </form>
  );
}
