"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MemberChatMessage } from "@/lib/types";
import { formatEuroAmount } from "@/lib/utils/money";

export type ChatPurchasePost = {
  id: string | null;
  slug: string | null;
  title: string;
  price: number | null;
  requestedPrice: number | null;
  isSellable: boolean | null;
};

function formatMessageTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getReadStatus(message: MemberChatMessage) {
  if (message.sender_role === "admin") {
    return message.read_by_member_at ? "прочитано" : "не прочитано";
  }

  return message.read_by_admin_at ? "прочитано" : "не прочитано";
}

export function MessageThread({
  messages,
  memberLabel,
  adminLabel = "Lumina",
  emptyLabel,
  purchasePostsByMessageId,
  refreshIntervalMs = 10000
}: {
  messages: MemberChatMessage[];
  memberLabel: string;
  adminLabel?: string;
  emptyLabel: string;
  purchasePostsByMessageId?: Record<string, ChatPurchasePost>;
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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/30">Сообщения</p>
        <button
          type="button"
          onClick={() =>
            startTransition(() => {
              router.refresh();
            })
          }
          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/60 transition hover:border-cyanGlow/30 hover:bg-cyanGlow/10 hover:text-white"
        >
          Обновить
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="h-[520px] overflow-y-auto rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-3 pr-2 sm:h-[640px] sm:p-4 sm:pr-3"
      >
        {messages.length ? (
          <div className="space-y-3">
            {messages.map((message) => {
              const isAdminMessage = message.sender_role === "admin";
              const readStatus = getReadStatus(message);
              const purchasePost = purchasePostsByMessageId?.[message.id];

              return (
                <div
                  key={message.id}
                  className={`flex ${isAdminMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-[24px] border px-3 py-2.5 shadow-[0_12px_26px_rgba(0,0,0,0.12)] sm:max-w-[72%] sm:px-4 ${
                      isAdminMessage
                        ? "rounded-br-[10px] border-cyanGlow/28 bg-[linear-gradient(180deg,rgba(63,191,255,0.24),rgba(63,191,255,0.14))] text-white"
                        : "rounded-bl-[10px] border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/42">
                        {isAdminMessage ? adminLabel : memberLabel}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-white/38">
                        <span>{formatMessageTime(message.created_at)}</span>
                        <span className="text-white/32">{readStatus}</span>
                      </div>
                    </div>

                    {message.body ? (
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-white/92">{message.body}</p>
                    ) : null}

                    {purchasePost ? (
                      <div className="mt-2.5 rounded-[16px] border border-fuchsia-300/15 bg-fuchsia-400/[0.08] px-3 py-2.5 text-xs leading-5 text-white/75">
                        <p className="font-semibold text-white">Пост: {purchasePost.title}</p>
                        <p className="mt-1">
                          Цена сейчас: {purchasePost.price != null ? formatEuroAmount(purchasePost.price) : "не задана"}
                        </p>
                        {purchasePost.requestedPrice != null ? (
                          <p className="text-white/60">Цена на момент заявки: {formatEuroAmount(purchasePost.requestedPrice)}</p>
                        ) : (
                          <p className="text-white/50">В заявке сумма не указана.</p>
                        )}
                        {purchasePost.isSellable === false ? (
                          <p className="text-white/50">Пост пока не отмечен как платный.</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {purchasePost.slug ? (
                            <Link href={`/tg/content/${encodeURIComponent(purchasePost.slug)}`} className="rounded-full border border-white/16 px-2.5 py-1 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-200/70">
                              Открыть пост ↗
                            </Link>
                          ) : null}
                          {purchasePost.id ? (
                            <Link href={`/tg/admin/posts#post-${purchasePost.id}`} className="rounded-full border border-white/12 px-2.5 py-1 text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-200/70">
                              Настроить цену
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {message.media_url ? (
                      <div className="mt-3 space-y-3">
                        <div className="overflow-hidden rounded-[20px] border border-white/10 bg-black/20">
                          {message.media_type === "audio" ? (
                            <audio src={message.media_url} controls preload="metadata" className="w-full" />
                          ) : message.media_type === "video" ? (
                            <video
                              src={message.media_url}
                              controls
                              className="max-h-[460px] w-full bg-black object-contain"
                            />
                          ) : (
                            <a href={message.media_url} target="_blank" rel="noreferrer" className="block">
                              <Image
                                src={message.media_url}
                                width={1600}
                                height={1200}
                                unoptimized
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
                            className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/78 transition hover:border-cyanGlow/30 hover:bg-white/5 hover:text-white"
                          >
                            {message.media_type === "audio"
                              ? "Открыть аудио"
                              : message.media_type === "video"
                                ? "Открыть видео"
                                : "Открыть фото"}
                          </a>
                          <a
                            href={message.media_url}
                            download
                            className="rounded-full border border-cyanGlow/28 bg-cyanGlow/10 px-3 py-2 text-xs text-cyanGlow transition hover:bg-cyanGlow/20"
                          >
                            Сохранить
                          </a>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-6 text-sm text-white/50">
            {emptyLabel}
          </div>
        )}
      </div>

      <p className="px-1 text-xs text-white/32">Новые сообщения подтягиваются автоматически.</p>
    </div>
  );
}
