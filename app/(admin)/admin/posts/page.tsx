import { PrivateShell } from "@/components/layout/private-shell";
import { PostCreateForm } from "@/components/admin/post-create-form";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { deletePostAction, updatePostAction } from "@/app/actions";
import { formatDate } from "@/lib/utils/format";

export default async function AdminPostsPage() {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();
  const { data: posts } = await admin
    .from("posts")
    .select("*, post_media(*)")
    .order("created_at", { ascending: false });

  return (
    <PrivateShell profile={profile} admin>
      <div className="space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">Posts Manager</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Создание публикаций</h2>
          <PostCreateForm />
        </section>

        <section className="space-y-4">
          {posts?.map((post) => (
            <article key={post.id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">{post.title}</h3>
                  <p className="mt-2 text-sm text-white/55">
                    {post.post_type} • {post.required_tier} • {post.status} • {formatDate(post.publish_at)}
                  </p>
                </div>
                <form action={deletePostAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <button className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-100">
                    Удалить
                  </button>
                </form>
              </div>

              <form action={updatePostAction} className="grid gap-4">
                <input type="hidden" name="postId" value={post.id} />
                <div className="grid gap-4 md:grid-cols-2">
                  <input name="title" defaultValue={post.title} />
                  <select name="requiredTier" defaultValue={post.required_tier}>
                    <option value="tier_1">Tier 1</option>
                    <option value="tier_2">Tier 2</option>
                    <option value="tier_3">Tier 3</option>
                  </select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <select name="postType" defaultValue={post.post_type}>
                    <option value="announcement">announcement</option>
                    <option value="text">text</option>
                    <option value="gallery">gallery</option>
                    <option value="video">video</option>
                  </select>
                  <select name="status" defaultValue={post.status}>
                    <option value="draft">draft</option>
                    <option value="published">published</option>
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
