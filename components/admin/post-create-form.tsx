"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmojiToolbar } from "@/components/forms/emoji-toolbar";
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
  upload_url?: string;
  upload_method?: "PUT";
  error?: string;
};

type MultipartStartResponse = ServerUploadResponse & {
  upload_id: string | null;
  worker_create_url?: string | null;
  worker_upload_url?: string | null;
  worker_complete_url?: string | null;
  worker_abort_url?: string | null;
  worker_token?: string | null;
};

const TARGET_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2560;
const SERVER_UPLOAD_FALLBACK_MAX_BYTES = 4 * 1024 * 1024;
const SERVER_UPLOAD_CHUNK_BYTES = 6 * 1024 * 1024;
const DEFAULT_POST_TITLE = "Lumina Secret Drop";
const CLUB_DESTINATION_HINT = "Материал будет опубликован только внутри закрытого клуба.";

function isCompressibleImage(file: File) {
  return file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp";
}

function replaceFileExtension(fileName: string, nextExtension: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return `${baseName}.${nextExtension}`;
}

async function uploadFileToSignedUrl(
  file: File,
  {
    uploadUrl,
    contentType,
    method = "PUT"
  }: {
    uploadUrl: string;
    contentType: string;
    method?: "PUT";
  }
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, uploadUrl, true);
    xhr.responseType = "text";
    xhr.timeout = 5 * 60 * 1000;
    xhr.setRequestHeader("Content-Type", contentType || "application/octet-stream");

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Не удалось загрузить файл в хранилище. R2 вернул ${xhr.status}.${xhr.responseText ? ` ${String(xhr.responseText).slice(0, 240)}` : ""}`
        )
      );
    };

    xhr.onerror = () => {
      reject(
        new Error(
          "Сетевой запрос к хранилищу не выполнился. На iPhone это обычно связано с CORS, Telegram WebView или прямой загрузкой большого файла."
        )
      );
    };

    xhr.ontimeout = () => {
      reject(new Error("Загрузка файла в хранилище превысила лимит ожидания."));
    };

    xhr.onabort = () => {
      reject(new Error("Загрузка файла была прервана."));
    };

    xhr.send(file);
  });
}

async function uploadFileInChunks(
  file: File,
  {
    onProgress,
    onMessage
  }: {
    onProgress?: (percent: number) => void;
    onMessage?: (message: string) => void;
  } = {}
) {
  async function safeJson<T>(response: Response) {
    return (await response.json().catch(() => null)) as T | null;
  }

  const startBody = new FormData();
  startBody.set("mode", "multipart-start");
  startBody.set("kind", "media");
  startBody.set("fileName", file.name);
  startBody.set("fileType", file.type);
  startBody.set("fileSize", String(file.size));

  const startResponse = await fetch("/api/admin/posts/upload-media", {
    method: "POST",
    body: startBody
  });
  const startPayload = ((await safeJson<MultipartStartResponse>(startResponse)) || {}) as MultipartStartResponse;

  if (!startResponse.ok) {
    throw new Error(startPayload.error || "Не удалось начать загрузку файла по частям.");
  }

  if (
    !startPayload.worker_create_url ||
    !startPayload.worker_upload_url ||
    !startPayload.worker_complete_url ||
    !startPayload.worker_abort_url ||
    !startPayload.worker_token
  ) {
    throw new Error("Не настроен upload worker для Telegram Mini App.");
  }

  const createResponse = await fetch(startPayload.worker_create_url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${startPayload.worker_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      objectKey: startPayload.object_key
    })
  });
  const createPayload = ((await safeJson<{
    ok?: boolean;
    uploadId?: string;
    workerToken?: string;
    error?: string;
  }>(createResponse)) || {}) as {
    ok?: boolean;
    uploadId?: string;
    workerToken?: string;
    error?: string;
  };

  if (!createResponse.ok || !createPayload.uploadId || !createPayload.workerToken) {
    throw new Error(createPayload.error || "Не удалось создать multipart-сессию в R2.");
  }

  const uploadId = createPayload.uploadId;
  const workerToken = createPayload.workerToken;
  const parts: Array<{ etag: string; partNumber: number }> = [];
  const totalParts = Math.max(1, Math.ceil(file.size / SERVER_UPLOAD_CHUNK_BYTES));

  try {
    for (let partIndex = 0; partIndex < totalParts; partIndex += 1) {
      const start = partIndex * SERVER_UPLOAD_CHUNK_BYTES;
      const end = Math.min(file.size, start + SERVER_UPLOAD_CHUNK_BYTES);
      const chunk = file.slice(start, end);
      const partNumber = partIndex + 1;

      onMessage?.(`Загружаю видео по частям: ${partNumber} из ${totalParts}`);

      const partBody = new FormData();
      partBody.set("uploadId", uploadId);
      partBody.set("objectKey", startPayload.object_key);
      partBody.set("partNumber", String(partNumber));
      partBody.set("chunk", chunk, `${file.name}.part-${partNumber}`);

      const partResponse = await fetch(startPayload.worker_upload_url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${workerToken}`
        },
        body: partBody
      });
      const partPayload = (await partResponse.json().catch(() => ({}))) as {
        ok?: boolean;
        etag?: string;
        error?: string;
      };

      if (!partResponse.ok || !partPayload.etag) {
        throw new Error(partPayload.error || `Не удалось загрузить часть ${partNumber}.`);
      }

      parts.push({
        etag: partPayload.etag,
        partNumber
      });
      onProgress?.(Math.round((partNumber / totalParts) * 100));
    }

    const completeResponse = await fetch(startPayload.worker_complete_url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${workerToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        uploadId,
        objectKey: startPayload.object_key,
        parts
      })
    });
    const completePayload = (await completeResponse.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };

    if (!completeResponse.ok || !completePayload.ok) {
      throw new Error(completePayload.error || "Не удалось завершить загрузку файла.");
    }

    return {
      provider: "r2" as const,
      bucket: startPayload.bucket,
      object_key: startPayload.object_key,
      storage_path: startPayload.storage_path,
      mime_type: startPayload.mime_type || file.type || "application/octet-stream",
      size_bytes: startPayload.size_bytes || file.size,
      media_type: startPayload.media_type
    };
  } catch (error) {
    await fetch(startPayload.worker_abort_url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${workerToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        uploadId,
        objectKey: startPayload.object_key
      })
    }).catch(() => undefined);

    throw error;
  }
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
  body.set("mode", "direct");
  body.set("kind", "media");
  body.set("fileName", file.name);
  body.set("fileType", file.type);
  body.set("fileSize", String(file.size));

  const response = await fetch("/api/admin/posts/upload-media", {
    method: "POST",
    body
  });

  const payload = (await response.json().catch(() => ({}))) as ServerUploadResponse;

  if (!response.ok) {
    throw new Error(payload.error || "Не удалось загрузить файл через сервер.");
  }

  if (!payload.upload_url) {
    throw new Error("Не удалось получить ссылку для загрузки.");
  }

  try {
    await uploadFileToSignedUrl(file, {
      uploadUrl: payload.upload_url,
      contentType: payload.mime_type || file.type || "application/octet-stream",
      method: payload.upload_method || "PUT"
    });

    return payload;
  } catch (directUploadError) {
    if (file.size > SERVER_UPLOAD_FALLBACK_MAX_BYTES) {
      throw directUploadError;
    }

    const fallbackBody = new FormData();
    fallbackBody.set("mode", "server");
    fallbackBody.set("kind", "media");
    fallbackBody.set("file", file);

    const fallbackResponse = await fetch("/api/admin/posts/upload-media", {
      method: "POST",
      body: fallbackBody
    });
    const fallbackPayload = (await fallbackResponse.json().catch(() => ({}))) as ServerUploadResponse;

    if (fallbackResponse.ok) {
      return fallbackPayload;
    }

    throw new Error(
      `${directUploadError instanceof Error ? directUploadError.message : "Прямая загрузка не сработала."} Сервер: ${fallbackResponse.status}. ${fallbackPayload.error || "Пустой ответ сервера."}`
    );
  }
}

export function PostCreateForm({ miniApp = false }: { miniApp?: boolean }) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadState>("idle");
  const [message, setMessage] = useState("Файлы пока не загружаются.");
  const [selectedTier, setSelectedTier] = useState<Tier>("tier_1");
  const [mediaNames, setMediaNames] = useState<string[]>([]);
  const [title, setTitle] = useState(DEFAULT_POST_TITLE);
  const [body, setBody] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState(`Новый пост в Lumina: ${DEFAULT_POST_TITLE}`);
  const [emailBody, setEmailBody] = useState(
    `Привет, {{name}}!\n\nВ клубе вышел новый пост: ${DEFAULT_POST_TITLE}.\n\nОткрыть пост: {{post_url}}\n\nДо встречи внутри клуба.`
  );
  const [subjectEdited, setSubjectEdited] = useState(false);
  const [bodyEdited, setBodyEdited] = useState(false);

  function syncEmailDraft(nextTitle: string) {
    if (!subjectEdited) {
      setEmailSubject(`Новый пост в Lumina: ${nextTitle || DEFAULT_POST_TITLE}`);
    }

    if (!bodyEdited) {
      setEmailBody(
        `Привет, {{name}}!\n\nВ клубе вышел новый пост: ${nextTitle || DEFAULT_POST_TITLE}.\n\nОткрыть пост: {{post_url}}\n\nДо встречи внутри клуба.`
      );
    }
  }

  function updateTitle(nextTitle: string) {
    setTitle(nextTitle);
    syncEmailDraft(nextTitle);
  }

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
        const shouldUseChunkedUpload =
          miniApp && (file.type.startsWith("video/") || file.size > SERVER_UPLOAD_FALLBACK_MAX_BYTES);

        setMessage(
          shouldUseChunkedUpload
            ? `Готовлю безопасную загрузку видео: ${index + 1} из ${optimizedFiles.length}`
            : `Загружаю файл: ${index + 1} из ${optimizedFiles.length}`
        );

        const uploaded = shouldUseChunkedUpload
          ? await uploadFileInChunks(file, {
              onMessage: setMessage,
              onProgress: (percent) => {
                const overall = Math.round(
                  ((index + Math.min(percent, 100) / 100) / Math.max(optimizedFiles.length, 1)) * 90
                );
                setProgress(overall);
              }
            })
          : await uploadFileThroughServer(file);
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
        emailCampaign?: {
          enabled: boolean;
          sentCount: number;
          failedCount: number;
          skippedReason?: string | null;
        };
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Не удалось создать публикацию.");
      }

      setStatus("success");
      setProgress(100);
      if (payload.emailCampaign?.enabled) {
        if (payload.emailCampaign.skippedReason) {
          setMessage(`Публикация создана. Рассылка пропущена: ${payload.emailCampaign.skippedReason}`);
        } else {
          setMessage(
            `Публикация создана. Email: отправлено ${payload.emailCampaign.sentCount}, ошибок ${payload.emailCampaign.failedCount}.`
          );
        }
      } else {
        setMessage("Публикация создана.");
      }
      form.reset();
      setSelectedTier("tier_1");
      setMediaNames([]);
      setTitle(DEFAULT_POST_TITLE);
      setBody("");
      setSendEmail(false);
      setEmailSubject(`Новый пост в Lumina: ${DEFAULT_POST_TITLE}`);
      setEmailBody(
        `Привет, {{name}}!\n\nВ клубе вышел новый пост: ${DEFAULT_POST_TITLE}.\n\nОткрыть пост: {{post_url}}\n\nДо встречи внутри клуба.`
      );
      setSubjectEdited(false);
      setBodyEdited(false);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить файлы и создать публикацию.");
    }
  }

  const mediaAccept = ".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov,.m4v,.3gp,.3g2,image/*,video/*";

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-3" encType="multipart/form-data">
      <input type="hidden" name="postType" value="announcement" />
      <input type="hidden" name="status" value="published" />
      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <label className="mb-2 block text-sm text-white/60">Название</label>
          <div className="relative">
            <input
              name="title"
              value={title}
              onChange={(event) => updateTitle(event.target.value)}
              className="pr-12"
              required
            />
            {title.trim() ? (
              <button
                type="button"
                onClick={() => updateTitle("")}
                className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/25 text-white/60 transition hover:border-white/20 hover:bg-black/35 hover:text-white"
                aria-label="Очистить название"
                title="Очистить название"
              >
                ×
              </button>
            ) : null}
          </div>
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
            <option value="tier_4">{TIER_LABELS.tier_4}</option>
          </select>
          <p className="mt-2 text-xs leading-5 text-accentSoft">{TIER_ACCESS_HINTS[selectedTier]}</p>
        </div>
      </div>

      {!miniApp ? (
        <>
          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white/65">
            {CLUB_DESTINATION_HINT}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <label className="flex items-center gap-3 text-sm text-white/85">
              <input
                type="checkbox"
                name="sendEmailCampaign"
                checked={sendEmail}
                onChange={(event) => setSendEmail(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-transparent p-0"
              />
              <span>Сразу отправить email-рассылку по этому посту</span>
            </label>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Письмо уйдёт только тем участникам, которым доступен этот пост. Можно использовать{" "}
              <code>{"{{name}}"}</code>, <code>{"{{club_url}}"}</code> и <code>{"{{post_url}}"}</code>.
            </p>
            <div className={`mt-4 grid gap-3 ${sendEmail ? "" : "opacity-60"}`}>
              <input
                name="emailSubject"
                value={emailSubject}
                onChange={(event) => {
                  setSubjectEdited(true);
                  setEmailSubject(event.target.value);
                }}
                placeholder="Тема письма"
                disabled={!sendEmail}
              />
              <textarea
                name="emailBody"
                value={emailBody}
                onChange={(event) => {
                  setBodyEdited(true);
                  setEmailBody(event.target.value);
                }}
                placeholder="Текст письма"
                className="min-h-[180px]"
                disabled={!sendEmail}
              />
            </div>
          </div>
        </>
      ) : null}

      <div>
        <label className="mb-2 block text-sm text-white/60">Текст публикации</label>
        <textarea
          id="admin-post-body"
          name="body"
          placeholder="Основной текст поста."
          className="min-h-[180px]"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <div className="mt-3">
          <EmojiToolbar targetId="admin-post-body" label="Эмодзи для текста публикации" />
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-black/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">Предпросмотр</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Как пост увидят в ленте</h3>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">
            {TIER_LABELS[selectedTier]}
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-[#191a22]">
          <div className="h-28 border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.14),transparent_26%),linear-gradient(180deg,rgba(24,24,32,0.98),rgba(18,18,26,0.98))]" />
          <div className="px-4 py-4">
            <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-white/58">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">Объявление</span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                {TIER_LABELS[selectedTier]}
              </span>
            </div>
            <h4 className="mt-3 font-display text-[1.4rem] font-semibold leading-[1.05] text-white">
              {title || DEFAULT_POST_TITLE}
            </h4>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/60">
              {body.trim() ? body : "Здесь появится текст публикации до отправки в ленту."}
            </p>
            <div className="mt-4 rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Закрытый вид</p>
              <div className="mt-3 select-none space-y-2 opacity-75 blur-sm">
                <div className="h-4 w-5/6 rounded-full bg-white/12" />
                <div className="h-4 w-full rounded-full bg-white/10" />
                <div className="h-4 w-4/6 rounded-full bg-white/12" />
                <div className="mt-4 h-24 rounded-[18px] bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
              </div>
            </div>
          </div>
        </div>
      </section>

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
