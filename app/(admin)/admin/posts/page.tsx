import { deleteAllPostsAction, deletePostAction, updatePostAction } from "@/app/actions";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { PostCreateForm } from "@/components/admin/post-create-form";
import { PrivateShell } from "@/components/layout/private-shell";
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

export default async function AdminPostsPage() {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();
  const { data: posts } = await admin
    .from("posts")
    .select("*, post_media(*)")
    .order("created_at", { ascending: false });

  return (
    <PrivateShell profile={profile} admin>
      <div className="space-y-4">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-glow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">Posts Manager</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Создание публикаций</h2>
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
              buttonClassName="rounded-2xl border border-rose-400/35 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-400/15"
            />
          </div>
          <PostCreateForm />
        </section>

        <section className="space-y-3">
          {posts?.map((post) => (
            <article key={post.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{post.title}</h3>
                  <p className="mt-1 text-sm text-white/55">
                    {post.post_type} • {post.required_tier} • {post.status} • {formatDate(post.publish_at)}
                  </p>
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
                  buttonClassName="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-400/20"
                  hiddenFields={[{ name: "postId", value: post.id }]}
                />
              </div>

              <form action={updatePostAction} className="grid gap-3">
                <input type="hidden" name="postId" value={post.id} />
                <div className="grid gap-3 md:grid-cols-2">
                  <input name="title" defaultValue={post.title} />
                  <select name="requiredTier" defaultValue={post.required_tier}>
                    <option value="tier_1">Tier 1</option>
                    <option value="tier_2">Tier 2</option>
                    <option value="tier_3">Tier 3</option>
                  </select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <select name="postType" defaultValue={post.post_type}>
                    <option value="announcement">Объявление</option>
                    <option value="text">Текст</option>
                    <option value="gallery">Галерея</option>
                    <option value="video">Видео</option>
                  </select>
                  <select name="status" defaultValue={post.status}>
                    <option value="draft">Черновик</option>
                    <option value="published">Опубликован</option>
                  </select>
                </div>
                <textarea name="description" defaultValue={post.description ?? ""} />
                <textarea name="body" defaultValue={post.body ?? ""} />
                <button className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/85 transition hover:border-accent/35 hover:bg-white/5 sm:w-fit">
                  Сохранить изменения
                </button>
              </form>
            </article>
          ))}
        </section>
      </div>
    </PrivateShell>
  );
}
