"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminPostCommentNotice } from "@/lib/data/comments";

function formatCommentTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getAuthorLabel(comment: AdminPostCommentNotice) {
  const author = comment.profiles;

  if (!author) {
    return "Участник";
  }

  return author.display_name || author.nickname || "Участник";
}

function getPost(comment: AdminPostCommentNotice) {
  return Array.isArray(comment.posts) ? comment.posts[0] : comment.posts;
}

export function AdminCommentInbox({
  comments,
  lastSeenAt
}: {
  comments: AdminPostCommentNotice[];
  lastSeenAt: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const lastSeenTime = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
  const unreadCount = comments.filter((comment) => new Date(comment.created_at).getTime() > lastSeenTime).length;

  if (!comments.length) {
    return null;
  }

  return (
    <section className="club-comment-section relative overflow-hidden rounded-[28px] border p-4 shadow-[0_18px_46px_rgba(0,0,0,0.24)] sm:p-5">
      <div className="pointer-events-none absolute right-8 top-0 h-20 w-40 rounded-full bg-fuchsia-400/10 blur-3xl" />

      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="relative flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <p className="club-eyebrow text-[11px] uppercase tracking-[0.24em]">Комментарии</p>
          <h2 className="mt-2 font-display text-[1.5rem] font-semibold leading-tight text-white">
            {unreadCount ? "Новые комментарии" : "Последние комментарии"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-black/18 px-3 py-1.5 text-xs text-white/62">
            {unreadCount ? `${unreadCount} новых` : "Всё прочитано"}
          </span>
          <span className={`club-soft-action inline-flex h-9 w-9 items-center justify-center rounded-full border text-lg transition ${expanded ? "rotate-180" : ""}`}>
            ⌄
          </span>
        </div>
      </button>

      {expanded ? <div className="relative mt-4 space-y-3 lumina-rise">
        {comments.map((comment) => {
          const post = getPost(comment);
          const isUnread = new Date(comment.created_at).getTime() > lastSeenTime;

          return (
            <article
              key={comment.id}
              className={`rounded-[22px] border px-4 py-3 ${
                isUnread
                  ? "club-comment-node"
                  : "club-comment-node opacity-85"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-white">{getAuthorLabel(comment)}</span>
                  {comment.profiles?.role === "admin" ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white/48">
                      Lumina
                    </span>
                  ) : null}
                  {isUnread ? (
                    <span className="rounded-full border border-fuchsia-200/24 bg-fuchsia-300/14 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-fuchsia-50">
                      Новый
                    </span>
                  ) : null}
                </div>
                <time className="text-xs text-white/38" dateTime={comment.created_at}>
                  {formatCommentTime(comment.created_at)}
                </time>
              </div>

              <p className="mt-2 text-xs text-white/42">
                К посту: <span className="text-white/70">{post?.title ?? "Пост удалён"}</span>
              </p>
              <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-white/78">
                {comment.body}
              </p>

              {post?.slug ? (
                <Link
                  href={`/tg/content/${post.slug}#comments`}
                  className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/72 transition hover:border-fuchsia-200/28 hover:bg-fuchsia-400/10 hover:text-white"
                >
                  Открыть обсуждение
                </Link>
              ) : null}
            </article>
          );
        })}
      </div> : null}
    </section>
  );
}
