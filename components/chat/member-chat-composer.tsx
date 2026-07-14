"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { VoiceRecorder } from "@/components/forms/voice-recorder";

type UploadState = "idle" | "uploading" | "success" | "error";

const errorMessages: Record<string, string> = {
  empty: "Напиши сообщение или прикрепи файл/голосовое.",
  limit: "Лимит сообщений на этот месяц закончился.",
  image: "В чат можно загрузить изображение или голосовое.",
  upload: "Не получилось загрузить вложение. Проверь размер и попробуй ещё раз.",
  send: "Не получилось отправить сообщение. Попробуй ещё раз."
};

export function MemberChatComposer({ isLimitReached }: { isLimitReached: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  function resetStatusForEdit() {
    if (status !== "uploading") {
      setStatus("idle");
      setProgress(0);
      setMessage("");
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    setSelectedFileName(file?.name ?? null);

    if (file && status !== "uploading") {
      setStatus("idle");
      setProgress(0);
      setMessage("Изображение готово к отправке.");
      return;
    }

    resetStatusForEdit();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLimitReached || status === "uploading") {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = String(formData.get("body") ?? "").trim();
    const media = formData.get("media");
    const voiceMedia = formData.get("voiceMedia");
    const hasMedia =
      (media instanceof File && media.size > 0) ||
      (voiceMedia instanceof File && voiceMedia.size > 0);

    if (!body && !hasMedia) {
      setStatus("error");
      setProgress(0);
      setMessage(errorMessages.empty);
      return;
    }

    const xhr = new XMLHttpRequest();

    setStatus("uploading");
    setProgress(hasMedia ? 1 : 35);
    setMessage(hasMedia ? "Загружаю вложение..." : "Отправляю сообщение...");

    xhr.upload.addEventListener("progress", (progressEvent) => {
      if (!progressEvent.lengthComputable) {
        return;
      }

      const nextProgress = Math.max(1, Math.round((progressEvent.loaded / progressEvent.total) * 100));
      setProgress(nextProgress);
      setMessage(hasMedia ? `Загружаю вложение: ${nextProgress}%` : "Отправляю сообщение...");
    });

    xhr.addEventListener("load", () => {
      let payload: { error?: string; success?: boolean } = {};

      try {
        payload = JSON.parse(xhr.responseText || "{}") as { error?: string; success?: boolean };
      } catch {
        payload = {};
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload.success) {
        setStatus("success");
        setProgress(100);
        setMessage("Сообщение отправлено.");
        formRef.current?.reset();
        setSelectedFileName(null);
        router.replace("/tg/chat?sent=1");
        router.refresh();
        return;
      }

      const errorKey = payload.error ?? "send";
      setStatus("error");
      setProgress(100);
      setMessage(errorMessages[errorKey] ?? errorMessages.send);
    });

    xhr.addEventListener("error", () => {
      setStatus("error");
      setProgress(0);
      setMessage("Ошибка сети при отправке сообщения.");
    });

    xhr.open("POST", "/api/telegram/chat");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    xhr.send(formData);
  }

  const showProgress = status !== "idle" || Boolean(selectedFileName);

  return (
    <form
      ref={formRef}
      action="/api/telegram/chat"
      method="post"
      encType="multipart/form-data"
      onSubmit={handleSubmit}
      className="mt-5 space-y-3"
    >
      <textarea
        name="body"
        rows={4}
        placeholder="Напиши сообщение админу"
        disabled={isLimitReached || status === "uploading"}
        onChange={resetStatusForEdit}
        className="w-full rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 disabled:cursor-not-allowed disabled:opacity-55"
      />

      <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
        <button
          type="button"
          disabled={isLimitReached || status === "uploading"}
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full cursor-pointer items-center justify-center rounded-[16px] border border-dashed border-white/14 px-4 py-3 text-sm text-white/60 transition hover:border-white/24 hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
        >
          {selectedFileName ? "Изображение выбрано" : "Прикрепить изображение"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          name="media"
          accept="image/*"
          className="hidden"
          disabled={isLimitReached || status === "uploading"}
          onChange={handleFileChange}
        />
      </div>

      <VoiceRecorder disabled={isLimitReached || status === "uploading"} />

      {showProgress ? (
        <div className="rounded-[20px] border border-white/10 bg-white/[0.035] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-white/34">Статус</p>
              <p className="mt-1 truncate text-sm text-white/70">
                {message || selectedFileName || "Изображение готово к отправке."}
              </p>
            </div>
            <span className="shrink-0 text-xs text-white/42">{progress}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                status === "error"
                  ? "bg-rose-400"
                  : "bg-[linear-gradient(90deg,#f0abfc,#a855f7,#60a5fa)]"
              } ${status === "uploading" && !progress ? "animate-pulse" : ""}`}
              style={{ width: `${Math.max(progress, selectedFileName && status === "idle" ? 8 : 0)}%` }}
            />
          </div>
          {selectedFileName ? <p className="mt-2 truncate text-xs text-white/35">{selectedFileName}</p> : null}
        </div>
      ) : null}

      <button
        disabled={isLimitReached || status === "uploading"}
        className="club-primary-action flex w-full items-center justify-center rounded-[20px] px-4 py-3 text-sm font-semibold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {isLimitReached
          ? "Лимит сообщений закончился"
          : status === "uploading"
            ? "Отправляю..."
            : "Отправить сообщение"}
      </button>
    </form>
  );
}
