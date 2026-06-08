import { deleteR2Objects, isR2StoragePath } from "@/lib/r2/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function getExpiredOrDraftPostIds() {
  const admin = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data } = await admin
    .from("posts")
    .select("id")
    .or(`status.eq.draft,and(expires_at.not.is.null,expires_at.lt.${nowIso})`);

  return (data ?? []).map((post) => post.id);
}

export async function removePostStorage(paths: string[]) {
  if (!paths.length) {
    return;
  }

  const admin = createAdminSupabaseClient();
  const uniquePaths = [...new Set(paths)];
  const r2Paths = uniquePaths.filter(isR2StoragePath);
  const supabasePaths = uniquePaths.filter((path) => !isR2StoragePath(path));

  if (supabasePaths.length) {
    await admin.storage.from("post-media").remove(supabasePaths);
  }

  if (r2Paths.length) {
    await deleteR2Objects(r2Paths);
  }
}

export async function deleteExpiredOrDraftPosts() {
  const admin = createAdminSupabaseClient();
  const postIds = await getExpiredOrDraftPostIds();

  if (!postIds.length) {
    return { deletedCount: 0 };
  }

  const [{ data: posts }, { data: media }] = await Promise.all([
    admin.from("posts").select("thumbnail_path").in("id", postIds),
    admin.from("post_media").select("storage_path").in("post_id", postIds)
  ]);

  await removePostStorage([
    ...((posts ?? [])
      .map((post) => post.thumbnail_path)
      .filter((path): path is string => Boolean(path))),
    ...((media ?? []).map((item) => item.storage_path))
  ]);

  await admin.from("posts").delete().in("id", postIds);

  return { deletedCount: postIds.length };
}
