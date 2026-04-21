"use client";

import { startTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MemberChatMessage } from "@/lib/types";

function formatMessageTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function MessageThread({
  messages,
  memberLabel,
  adminLabel = "Lumina",
  emptyLabel,
  refreshIntervalMs = 10000
}: {
  messages: MemberChatMessage[];
  memberLabel: string;
  adminLabel?: string;
  emptyLabel: string;
  refreshIntervalMs?: number;
}) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      startTransition(() => {
        router.refresh();
      });
    }, refreshIntervalMs);

    return () => window.clearInterval(timer);
  }, [refreshIntervalMs, router]);

  useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages]);

  return (
    <div className="space-y-3 rounded-3xl border border-white/10 bg-black/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.22em] text-white/35">История сообщений</p>
        <button
          type="button"
          onClick={() =>
            startTransition(() => {
              router.refresh();
            })
          }
          className="rounded-2xl border border-white/10 px-3 py-1.5 text-xs text-white/65 transition hover:border-accent/30 hover:bg-white/5 hover:text-white"
        >
          Обновить
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="max-h-[520px] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/15 p-3"
      >
        {messages.length ? (
          messages.map((message) => {
            const isAdminMessage = message.sender_role === "admin";

            return (
              <div
                key={message.id}
                className={`max-w-[92%] rounded-2xl border px-4 py-3 ${
                  isAdminMessage
                    ? "border-accent/25 bg-accent/10 text-white"
                    : "ml-auto border-cyanGlow/25 bg-cyanGlow/10 text-white"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                    {isAdminMessage ? adminLabel : memberLabel}
                  </p>
                  <p className="text-xs text-white/35">{formatMessageTime(message.created_at)}</p>
                </div>
                {message.body ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/88">
                    {message.body}
                  </p>
                ) : null}
                {message.media_url ? (
                  <div className="mt-3 space-y-3">
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                      {message.media_type === "video" ? (
                        <video
                          src={message.media_url}
                          controls
                          className="max-h-[460px] w-full bg-black object-contain"
                        />
                      ) : (
                        <a
                          href={message.media_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block"
                        >
                          <img
                            src={message.media_url}
                            alt="Вложение в чате"
                            className="max-h-[460px] w-full cursor-zoom-in bg-black object-contain transition hover:opacity-95"
                          />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={message.media_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-white/10 px-3 py-2 text-xs text-white/80 transition hover:border-accent/30 hover:bg-white/5 hover:text-white"
                      >
                        {message.media_type === "video" ? "Открыть видео" : "Открыть фото"}
                      </a>
                      <a
                        href={message.media_url}
                        download
                        className="rounded-2xl border border-cyanGlow/30 bg-cyanGlow/10 px-3 py-2 text-xs text-cyanGlow transition hover:bg-cyanGlow/20"
                      >
                        Сохранить
                      </a>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/50">
            {emptyLabel}
          </div>
        )}
      </div>

      <p className="text-xs text-white/35">Новые сообщения подтягиваются автоматически.</p>
    </div>
  );
}
