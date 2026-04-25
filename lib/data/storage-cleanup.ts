import { SupabaseClient } from "@supabase/supabase-js";
import { deleteR2Objects, listR2StoragePaths } from "@/lib/r2/server";

type CleanupResult = {
  postMedia: number;
  chatMedia: number;
  r2Media: number;
};

type StorageObject = {
  id: string | null;
  name: string;
};

export async function listBucketFiles(
  admin: SupabaseClient,
  bucket: string,
  prefix = ""
): Promise<string[]> {
  const { data, error } = await admin.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" }
  });

  if (error || !data) {
    return [];
  }

  const files: string[] = [];

  for (const item of data as StorageObject[]) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.id) {
      files.push(path);
    } else {
      files.push(...(await listBucketFiles(admin, bucket, path)));
    }
  }

  return files;
}

async function removeSupabaseOrphans(
  admin: SupabaseClient,
  bucket: string,
  usedPaths: Set<string>
) {
  const allPaths = await listBucketFiles(admin, bucket);
  const orphanPaths = allPaths.filter((path) => !usedPaths.has(path));

  if (orphanPaths.length) {
    await admin.storage.from(bucket).remove(orphanPaths);
  }

  return orphanPaths.length;
}

export async function cleanupOrphanedStorage(admin: SupabaseClient): Promise<CleanupResult> {
  const [
    { data: posts },
    { data: postMedia },
    { data: chatMessages }
  ] = await Promise.all([
    admin.from("posts").select("thumbnail_path"),
    admin.from("post_media").select("storage_path"),
    admin.from("member_chat_messages").select("media_path")
  ]);

  const usedPostMedia = new Set<string>();
  const usedR2Media = new Set<string>();

  for (const path of [
    ...((posts ?? []).map((post) => post.thumbnail_path)),
    ...((postMedia ?? []).map((media) => media.storage_path))
  ]) {
    if (!path) continue;

    if (path.startsWith("r2:")) {
      usedR2Media.add(path);
    } else {
      usedPostMedia.add(path);
    }
  }

  const usedChatMedia = new Set(
    (chatMessages ?? [])
      .map((message) => message.media_path)
      .filter((path): path is string => Boolean(path))
  );

  const [postMediaCount, chatMediaCount, r2Paths] = await Promise.all([
    removeSupabaseOrphans(admin, "post-media", usedPostMedia),
    removeSupabaseOrphans(admin, "chat-media", usedChatMedia),
    listR2StoragePaths().catch(() => [])
  ]);

  const orphanR2Paths = r2Paths.filter((path) => !usedR2Media.has(path));

  if (orphanR2Paths.length) {
    await deleteR2Objects(orphanR2Paths).catch(() => undefined);
  }

  return {
    postMedia: postMediaCount,
    chatMedia: chatMediaCount,
    r2Media: orphanR2Paths.length
  };
}
