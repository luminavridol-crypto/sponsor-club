"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

type MemberChatThreadMessage = {
  id: string;
  sender_role: "admin" | "member";
  body: string | null;
  media_url?: string | null;
  media_type?: "image" | "video" | "audio" | "file" | null;
  created_at: string;
};

export function MemberChatThread({ messages }: { messages: MemberChatThreadMessage[] }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages]);

  function scrollToLatest() {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth"
    });
  }

  if (!messages.length) {
    return (
      <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-5 text-sm leading-6 text-white/58">
        Здесь будет отдельный чат с админом. Ответы по заявкам и обычные сообщения теперь живут здесь, а оплата отправляется отдельно во вкладке реквизитов.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">Сообщения</p>
        <button
          type="button"
          onClick={scrollToLatest}
          className="club-soft-action rounded-full border px-3 py-1.5 text-[11px] transition"
        >
          Вниз
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="club-chat-thread max-h-[62vh] min-h-[22rem] overflow-y-auto rounded-[22px] border p-3 pr-2 sm:max-h-[34rem] sm:p-4 sm:pr-3"
      >
        <div className="space-y-3">
          {messages.map((message) => {
            const isMember = message.sender_role === "member";

            return (
              <div key={message.id} className={`flex ${isMember ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] rounded-[24px] px-4 py-3 shadow-[0_14px_30px_rgba(0,0,0,0.18)] ${
                    isMember
                      ? "club-chat-member border text-white"
                      : "border border-white/10 bg-white/[0.05] text-white/88"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/40">
                    <span>{isMember ? "Ты" : "Люмина"}</span>
                    <span>
                      {new Date(message.created_at).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>

                  {message.body ? <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p> : null}

                  {message.media_url ? (
                    message.media_type === "audio" ? (
                      <audio src={message.media_url} controls preload="metadata" className="mt-3 w-full" />
                    ) : message.media_type === "video" ? (
                      <video src={message.media_url} controls className="mt-3 max-h-[360px] w-full rounded-[18px] bg-black" />
                    ) : (
                      <a
                        href={message.media_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 block overflow-hidden rounded-[18px] border border-white/10 bg-black/20"
                      >
                        <Image
                          src={message.media_url}
                          width={1600}
                          height={1200}
                          unoptimized
                          alt="Вложение чата"
                          className="max-h-[360px] w-full object-contain"
                        />
                      </a>
                    )
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
