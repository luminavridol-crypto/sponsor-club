"use client";

import { useEffect, useRef, useState } from "react";

const MAX_RECORDING_SECONDS = 5 * 60;

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function getRecordingFormat() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/webm",
    "audio/ogg;codecs=opus"
  ];
  const mimeType = candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
  const baseType = mimeType.split(";")[0] || "audio/webm";
  const extension = baseType === "audio/mp4" ? "m4a" : baseType === "audio/ogg" ? "ogg" : "webm";

  return { mimeType, baseType, extension };
}

export function VoiceRecorder({
  name = "voiceMedia",
  disabled = false,
  className = ""
}: {
  name?: string;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const previewUrlRef = useRef<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function releaseStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearRecording() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setPreviewUrl(null);
    setElapsed(0);
    elapsedRef.current = 0;
    setError(null);
  }

  useEffect(() => {
    const input = inputRef.current;
    const form = input?.form;
    const handleReset = () => clearRecording();
    form?.addEventListener("reset", handleReset);

    return () => {
      form?.removeEventListener("reset", handleReset);
      clearTimer();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      releaseStream();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  async function startRecording() {
    if (disabled || isRecording) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Запись голоса не поддерживается в этом браузере.");
      return;
    }

    try {
      clearRecording();
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const { mimeType } = getRecordingFormat();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });

      recorder.addEventListener("stop", () => {
        const { baseType, extension } = getRecordingFormat();
        const blob = new Blob(chunksRef.current, { type: baseType });
        clearTimer();
        releaseStream();
        setIsRecording(false);

        if (!blob.size) {
          setError("Не удалось сохранить запись. Попробуй ещё раз.");
          return;
        }

        const file = new File([blob], `voice-${Date.now()}.${extension}`, {
          type: baseType,
          lastModified: Date.now()
        });
        const transfer = new DataTransfer();
        transfer.items.add(file);
        if (inputRef.current) inputRef.current.files = transfer.files;

        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setPreviewUrl(url);
      });

      recorder.start(1000);
      setIsRecording(true);
      elapsedRef.current = 0;
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= MAX_RECORDING_SECONDS && recorder.state === "recording") {
          recorder.stop();
        }
      }, 1000);
    } catch (recordingError) {
      releaseStream();
      setIsRecording(false);
      setError(
        recordingError instanceof DOMException && recordingError.name === "NotAllowedError"
          ? "Разреши доступ к микрофону, чтобы записать голосовое."
          : "Не удалось включить микрофон."
      );
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  return (
    <div className={`rounded-[20px] border border-white/10 bg-white/[0.03] p-3 ${className}`}>
      <input ref={inputRef} type="file" name={name} accept="audio/*" className="hidden" />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={isRecording ? stopRecording : startRecording}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
            isRecording
              ? "border-rose-300/30 bg-rose-400/15 text-rose-100"
              : "border-fuchsia-200/20 bg-fuchsia-400/10 text-white hover:bg-fuchsia-400/16"
          }`}
        >
          {isRecording ? `Остановить · ${formatDuration(elapsed)}` : "🎙 Записать голосовое"}
        </button>
        {previewUrl ? (
          <button
            type="button"
            onClick={clearRecording}
            className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/55 transition hover:text-white"
          >
            Удалить запись
          </button>
        ) : null}
      </div>
      {isRecording ? <p className="mt-2 text-xs text-rose-100/70">Идёт запись. Максимум 5 минут.</p> : null}
      {previewUrl ? <audio src={previewUrl} controls preload="metadata" className="mt-3 w-full" /> : null}
      {error ? <p className="mt-2 text-xs text-rose-200">{error}</p> : null}
    </div>
  );
}
