"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EmojiToolbar } from "@/components/forms/emoji-toolbar";
import { VoiceRecorder } from "@/components/forms/voice-recorder";

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
    const voiceMedia = formData.get("voiceMedia");
    const hasMedia =
      (media instanceof File && media.size > 0) ||
      (voiceMedia instanceof File && voiceMedia.size > 0);

    if (!body && !hasMedia) {
      setStatus("error");
      setMessage("Напиши сообщение или прикрепи файл/голосовое.");
      return;
    }

    const xhr = new XMLHttpRequest();

    setStatus("uploading");
    setProgress(0);
    setMessage("Отправляю сообщение...");

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
    <form ref={formRef} onSubmit={handleSubmit} className="mt-3">
      <input type="hidden" name="profileId" value={profileId} />

      <div className="rounded-[26px] border border-white/10 bg-black/22 p-3 sm:p-4">
        <textarea
          id="admin-chat-body"
          name="body"
          placeholder={`Сообщение для ${memberLabel}...`}
          className="min-h-[56px] rounded-[22px] border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 sm:min-h-[64px]"
        />

        <div className="mt-3 flex flex-col gap-3">
          <VoiceRecorder disabled={status === "uploading"} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <EmojiToolbar targetId="admin-chat-body" label="Эмодзи" />

            <div className="flex flex-wrap items-center gap-2">
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
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/75 transition hover:border-cyanGlow/30 hover:bg-white/6 hover:text-white"
              >
                Файл
              </button>

              <button
                disabled={status === "uploading"}
                className="rounded-full border border-cyanGlow/28 bg-cyanGlow/16 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyanGlow/24 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === "uploading" ? "Отправляю..." : "Отправить"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="truncate text-sm text-white/45">{selectedFileName}</p>
            <p className="text-xs text-white/35">Фото и видео можно отправлять прямо в личный чат.</p>
          </div>

          {hasProgressInfo ? (
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center justify-between text-sm text-white/70">
                <span>Статус</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className={`h-full rounded-full transition-all ${
                    status === "error" ? "bg-rose-400" : "bg-cyanGlow"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-white/60">
                {status === "idle" ? message || "Файл выбран и готов к отправке." : message}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </form>
  );
}
