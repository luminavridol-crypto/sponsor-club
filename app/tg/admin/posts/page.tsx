export const dynamic = "force-dynamic";

import { deleteAllPostsAction, deletePostAction, updatePostAction } from "@/app/actions";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { PostCreateForm } from "@/components/admin/post-create-form";
import { PostsVisibilityToggle } from "@/components/admin/posts-visibility-toggle";
import {
  ADMIN_BADGE_CLASS,
  ADMIN_BUTTON_DANGER_CLASS,
  ADMIN_BUTTON_SECONDARY_CLASS,
  ADMIN_EYEBROW_CLASS,
  ADMIN_HEADER_CLASS,
  ADMIN_INPUT_CLASS,
  ADMIN_PANEL_CLASS,
  ADMIN_PANEL_GLOW_CLASS,
  ADMIN_SECTION_TITLE_CLASS,
  ADMIN_SELECT_CLASS,
  ADMIN_SHELL_CLASS,
  ADMIN_SUBPANEL_CLASS,
  ADMIN_TEXTAREA_CLASS
} from "@/components/admin/theme";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils/format";

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

export default async function TelegramAdminPostsPage() {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();
  const { data: posts } = await admin
    .from("posts")
    .select("*, post_media(*)")
    .order("created_at", { ascending: false });

  return (
    <MiniAppShell
      profile={profile}
      title="Посты"
      shellClassName={ADMIN_SHELL_CLASS}
      headerClassName={ADMIN_HEADER_CLASS}
      eyebrowClassName={ADMIN_EYEBROW_CLASS}
    >
      <section className={ADMIN_PANEL_CLASS}>
        <div className={ADMIN_PANEL_GLOW_CLASS} />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className={ADMIN_SECTION_TITLE_CLASS}>Новый пост</h2>
          </div>
          <ConfirmActionForm
            action={deleteAllPostsAction}
            confirmMessage="Удалить все посты? Это действие нельзя отменить."
            buttonLabel={
              <span className="inline-flex items-center gap-2">
                <TrashIcon />
                Удалить все посты
              </span>
            }
            buttonClassName={ADMIN_BUTTON_DANGER_CLASS}
          />
        </div>
        <div className="relative mt-5">
          <PostCreateForm miniApp />
        </div>
      </section>

      <PostsVisibilityToggle>
        {posts?.map((post) => (
          <article key={post.id} className={ADMIN_SUBPANEL_CLASS}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <span className={ADMIN_BADGE_CLASS}>{post.post_type}</span>
                  <span className={ADMIN_BADGE_CLASS}>{post.required_tier}</span>
                  <span className={ADMIN_BADGE_CLASS}>{post.status}</span>
                </div>
                <h3 className="font-display mt-3 text-[1.35rem] font-semibold text-white">{post.title}</h3>
                <p className="mt-2 text-sm text-white/55">Опубликовано: {formatDate(post.publish_at)}</p>
              </div>
              <ConfirmActionForm
                action={deletePostAction}
                confirmMessage="Удалить этот пост?"
                buttonLabel={
                  <span className="inline-flex items-center gap-2">
                    <TrashIcon />
                    Удалить
                  </span>
                }
                buttonClassName={ADMIN_BUTTON_DANGER_CLASS}
                hiddenFields={[{ name: "postId", value: post.id }]}
              />
            </div>

            <form action={updatePostAction} className="grid gap-3">
              <input type="hidden" name="postId" value={post.id} />
              <div className="grid gap-3 lg:grid-cols-2">
                <input name="title" defaultValue={post.title} className={ADMIN_INPUT_CLASS} />
                <select name="requiredTier" defaultValue={post.required_tier} className={ADMIN_SELECT_CLASS}>
                  <option value="tier_1">Tier 1</option>
                  <option value="tier_2">Tier 2</option>
                  <option value="tier_3">Tier 3</option>
                  <option value="tier_4">After Dark</option>
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <select name="postType" defaultValue={post.post_type} className={ADMIN_SELECT_CLASS}>
                  <option value="announcement">Объявление</option>
                  <option value="text">Текст</option>
                  <option value="gallery">Галерея</option>
                  <option value="video">Видео</option>
                  <option value="audio">Голосовой</option>
                </select>
                <select name="status" defaultValue={post.status} className={ADMIN_SELECT_CLASS}>
                  <option value="draft">Черновик</option>
                  <option value="published">Опубликован</option>
                </select>
              </div>

              <textarea name="description" defaultValue={post.description ?? ""} className={`${ADMIN_TEXTAREA_CLASS} min-h-[120px]`} />
              <textarea name="body" defaultValue={post.body ?? ""} className={`${ADMIN_TEXTAREA_CLASS} min-h-[220px]`} />

              <button className={`w-full sm:w-fit ${ADMIN_BUTTON_SECONDARY_CLASS}`}>Сохранить изменения</button>
            </form>
          </article>
        ))}
      </PostsVisibilityToggle>
    </MiniAppShell>
  );
}
