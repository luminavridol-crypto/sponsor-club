"use client";

import { useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createPostCommentAction, deletePostCommentAction } from "@/app/actions";
import { EmojiToolbar } from "@/components/forms/emoji-toolbar";
import { VoiceRecorder } from "@/components/forms/voice-recorder";
import { CommentReactions } from "@/components/posts/comment-reactions";
import { ReactionSummary } from "@/lib/data/reactions";
import { PostCommentWithAuthor } from "@/lib/types";

function formatCommentTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getAuthorLabel(comment: PostCommentWithAuthor) {
  const author = comment.profiles;

  if (!author) {
    return "Участник";
  }

  return author.display_name || author.nickname || "Участник";
}

function parseReplyBody(body: string) {
  const normalizedBody = body.replace(/\r\n/g, "\n").trim();
  const match = normalizedBody.match(/^@([^\n]+)\n>\s?([\s\S]*?)\n\n([\s\S]+)$/);

  if (!match) {
    return null;
  }

  const [, replyAuthor, replyPreview, message] = match;
  return {
    replyAuthor: replyAuthor.trim(),
    replyPreview: replyPreview.trim(),
    message: message.trim()
  };
}

type CommentNode = {
  comment: PostCommentWithAuthor;
  authorLabel: string;
  parsedReply: ReturnType<typeof parseReplyBody>;
  children: CommentNode[];
};

function buildCommentThreads(comments: PostCommentWithAuthor[]) {
  const roots: CommentNode[] = [];
  const allNodes: CommentNode[] = [];

  for (const comment of comments) {
    const authorLabel = getAuthorLabel(comment);
    const parsedReply = parseReplyBody(comment.body);
    const node: CommentNode = {
      comment,
      authorLabel,
      parsedReply,
      children: []
    };

    if (parsedReply) {
      const parent = [...allNodes]
        .reverse()
        .find(
          (candidate) =>
            candidate.authorLabel === parsedReply.replyAuthor &&
            candidate.comment.body.trim().startsWith(parsedReply.replyPreview)
        );

      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }

    allNodes.push(node);
  }

  return roots;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-background transition hover:bg-goldSoft disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Отправляю..." : "Отправить"}
    </button>
  );
}

export function PostComments({
  postId,
  postSlug,
  comments,
  currentProfileId,
  admin = false,
  reactionSummaries
}: {
  postId: string;
  postSlug: string;
  comments: PostCommentWithAuthor[];
  currentProfileId: string;
  admin?: boolean;
  reactionSummaries: Map<string, ReactionSummary>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");
  const [replyTarget, setReplyTarget] = useState<{ id: string; author: string; preview: string } | null>(
    null
  );

  const commentThreads = useMemo(() => buildCommentThreads(comments), [comments]);

  const replyTemplate = useMemo(() => {
    if (!replyTarget) {
      return "";
    }

    return `@${replyTarget.author}\n> ${replyTarget.preview}\n\n`;
  }, [replyTarget]);

  async function action(formData: FormData) {
    await createPostCommentAction(formData);
    formRef.current?.reset();
    setBody("");
    setReplyTarget(null);
  }

  function renderCommentNode(node: CommentNode, depth = 0) {
    const { comment, authorLabel, parsedReply, children } = node;
    const canDelete = admin || comment.profile_id === currentProfileId;
    const displayBody = parsedReply ? parsedReply.message : comment.body;
    const previewSource = displayBody.slice(0, 140);

    return (
      <div
        key={comment.id}
        className={
          depth === 0
            ? "club-comment-node rounded-3xl border px-4 py-3"
            : "club-comment-reply relative ml-4 border-l pl-4 sm:ml-8 sm:pl-5"
        }
      >
        <div
          className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${
            depth > 0 ? "club-comment-node rounded-[24px] border px-4 py-3" : ""
          }`}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-white">{authorLabel}</p>
              {comment.profiles?.role === "admin" ? (
                <span className="club-tier-badge rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.18em]">
                  Lumina
                </span>
              ) : null}
              {depth > 0 ? (
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white/45">
                  Ответ
                </span>
              ) : null}
            </div>

            {parsedReply ? (
              <div className="club-comment-quote mt-3 rounded-2xl border px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                  Ответ для {parsedReply.replyAuthor}
                </p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm leading-5 text-white/55">
                  {parsedReply.replyPreview}
                </p>
              </div>
            ) : null}

            {displayBody ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/78">{displayBody}</p>
            ) : null}
            {comment.media_url && comment.media_type === "audio" ? (
              <audio src={comment.media_url} controls preload="metadata" className="mt-3 w-full" />
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const template = `@${authorLabel}\n> ${previewSource}\n\n`;
                  setReplyTarget({
                    id: comment.id,
                    author: authorLabel,
                    preview: previewSource
                  });
                  setBody((current) => (current.trim() ? `${current}\n\n${template}` : template));
                  document.getElementById("post-comment-body")?.focus();
                }}
                className="club-soft-action rounded-full border px-3 py-1.5 text-xs transition"
              >
                Ответить
              </button>
            </div>

            <CommentReactions
              commentId={comment.id}
              postSlug={postSlug}
              summary={
                reactionSummaries.get(comment.id) ?? {
                  counts: { heart: 0, fire: 0, cry: 0, sparkles: 0, devil: 0 },
                  selectedReaction: null
                }
              }
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
            <time className="text-xs text-white/35" dateTime={comment.created_at}>
              {formatCommentTime(comment.created_at)}
            </time>
            {canDelete ? (
              <form
                action={deletePostCommentAction}
                onSubmit={(event) => {
                  if (!window.confirm("Удалить этот комментарий?")) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="commentId" value={comment.id} />
                <input type="hidden" name="postSlug" value={postSlug} />
                <button
                  type="submit"
                  title="Удалить комментарий"
                  aria-label="Удалить комментарий"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-400/20 bg-rose-400/5 text-rose-200/75 transition hover:border-rose-300/40 hover:bg-rose-400/15 hover:text-rose-100"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v5" />
                    <path d="M14 11v5" />
                  </svg>
                </button>
              </form>
            ) : null}
          </div>
        </div>

        {children.length ? <div className="mt-3 space-y-3">{children.map((child) => renderCommentNode(child, depth + 1))}</div> : null}
      </div>
    );
  }

  return (
    <section
      id="comments"
      className="club-comment-section scroll-mt-24 rounded-[32px] border p-5 shadow-glow sm:p-6"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="club-eyebrow text-xs uppercase tracking-[0.24em]">Comments</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Комментарии</h3>
        </div>
        <p className="text-sm text-white/45">{comments.length} всего</p>
      </div>

      <div className="mt-5 space-y-3">
        {commentThreads.length ? (
          commentThreads.map((thread) => renderCommentNode(thread))
        ) : (
          <div className="club-comment-node rounded-3xl border border-dashed px-4 py-6 text-sm text-white/50">
            Будь первым, кто оставит комментарий к этому посту.
          </div>
        )}
      </div>

      <form ref={formRef} action={action} encType="multipart/form-data" className="mt-5 space-y-3">
        <input type="hidden" name="postId" value={postId} />
        <input type="hidden" name="postSlug" value={postSlug} />
        <input type="hidden" name="replyToCommentId" value={replyTarget?.id ?? ""} />
        <input type="hidden" name="replyToAuthor" value={replyTarget?.author ?? ""} />
        <textarea
          id="post-comment-body"
          name="body"
          maxLength={1000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={replyTarget ? `Ответить ${replyTarget.author}...` : "Написать комментарий..."}
          className="min-h-[120px]"
        />
        <EmojiToolbar targetId="post-comment-body" label="Эмодзи для комментария" />
        <VoiceRecorder />
        {replyTarget ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
            <div className="flex items-center justify-between gap-3">
              <span>
                Ответ к <span className="text-white">{replyTarget.author}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setReplyTarget(null);
                  setBody((current) => current.replace(replyTemplate, ""));
                }}
                className="text-xs text-white/45 transition hover:text-white"
              >
                Убрать
              </button>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-xs text-white/45">{replyTemplate.trim()}</p>
          </div>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/35">
            До 1000 символов или голосовое до 5 минут. Гостям отправка недоступна.
          </p>
          <SubmitButton />
        </div>
      </form>
    </section>
  );
}
