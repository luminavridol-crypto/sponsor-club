"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { createPostCommentAction, deletePostCommentAction } from "@/app/actions";
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

  return author.display_name || author.nickname || author.email.split("@")[0] || "Участник";
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
  admin = false
}: {
  postId: string;
  postSlug: string;
  comments: PostCommentWithAuthor[];
  currentProfileId: string;
  admin?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  async function action(formData: FormData) {
    await createPostCommentAction(formData);
    formRef.current?.reset();
  }

  return (
    <section
      id="comments"
      className="scroll-mt-24 rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-glow sm:p-6"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-accentSoft">Comments</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Комментарии</h3>
        </div>
        <p className="text-sm text-white/45">{comments.length} всего</p>
      </div>

      <div className="mt-5 space-y-3">
        {comments.length ? (
          comments.map((comment) => {
            const canDelete = admin || comment.profile_id === currentProfileId;

            return (
              <article
                key={comment.id}
                className="rounded-3xl border border-white/10 bg-black/15 px-4 py-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-white">{getAuthorLabel(comment)}</p>
                      {comment.profiles?.role === "admin" ? (
                        <span className="rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-accentSoft">
                          Lumina
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/78">
                      {comment.body}
                    </p>
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
              </article>
            );
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-black/10 px-4 py-6 text-sm text-white/50">
            Будь первым, кто оставит комментарий к этому посту.
          </div>
        )}
      </div>

      <form ref={formRef} action={action} className="mt-5 space-y-3">
        <input type="hidden" name="postId" value={postId} />
        <input type="hidden" name="postSlug" value={postSlug} />
        <textarea
          name="body"
          required
          maxLength={1000}
          placeholder="Написать комментарий..."
          className="min-h-[120px]"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/35">
            До 1000 символов. Комментарий увидят участники с доступом к посту.
          </p>
          <SubmitButton />
        </div>
      </form>
    </section>
  );
}
