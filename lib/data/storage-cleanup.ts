import { SupabaseClient } from "@supabase/supabase-js";
import { listR2Media } from "@/lib/storage/media";

type CleanupResult = {
  postMedia: number;
  chatMedia: number;
  r2Media: number;
};

export type StorageFileEntry = {
  path: string;
  sizeBytes: number;
};

export type OrphanedStorageReport = {
  postMedia: StorageFileEntry[];
  chatMedia: StorageFileEntry[];
  r2Media: StorageFileEntry[];
  totalCount: number;
  totalBytes: number;
};

type StorageObject = {
  id: string | null;
  name: string;
  metadata?: {
    size?: number;
  } | null;
};

export async function listBucketFiles(
  admin: SupabaseClient,
  bucket: string,
  prefix = ""
): Promise<string[]> {
  const files = await listBucketFileEntries(admin, bucket, prefix);
  return files.map((file) => file.path);
}

export async function listBucketFileEntries(
  admin: SupabaseClient,
  bucket: string,
  prefix = ""
): Promise<StorageFileEntry[]> {
  const { data, error } = await admin.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" }
  });

  if (error || !data) {
    return [];
  }

  const files: StorageFileEntry[] = [];

  for (const item of data as StorageObject[]) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.id) {
      files.push({
        path,
        sizeBytes: item.metadata?.size ?? 0
      });
    } else {
      files.push(...(await listBucketFileEntries(admin, bucket, path)));
    }
  }

  return files;
}

export async function getBucketStorageUsage(
  admin: SupabaseClient,
  bucket: string,
  prefix = ""
): Promise<{ fileCount: number; totalBytes: number }> {
  const { data, error } = await admin.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" }
  });

  if (error || !data) {
    return {
      fileCount: 0,
      totalBytes: 0
    };
  }

  let fileCount = 0;
  let totalBytes = 0;

  for (const item of data as StorageObject[]) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.id) {
      fileCount += 1;
      totalBytes += item.metadata?.size ?? 0;
    } else {
      const nested = await getBucketStorageUsage(admin, bucket, path);
      fileCount += nested.fileCount;
      totalBytes += nested.totalBytes;
    }
  }

  return {
    fileCount,
    totalBytes
  };
}

async function removeSupabaseOrphans(
  admin: SupabaseClient,
  bucket: string,
  usedPaths: Set<string>
) {
  const allPaths = await listBucketFiles(admin, bucket);
  const orphanPaths = allPaths.filter((path) => !usedPaths.has(path));
  return orphanPaths.length;
}

export async function getOrphanedStorageReport(admin: SupabaseClient): Promise<OrphanedStorageReport> {
  const [
    { data: posts },
    { data: postMedia },
    { data: chatMessages },
    postMediaFiles,
    chatMediaFiles,
    r2Files
  ] = await Promise.all([
    admin.from("posts").select("thumbnail_path"),
    admin.from("post_media").select("storage_path"),
    admin.from("member_chat_messages").select("media_path"),
    listBucketFileEntries(admin, "post-media"),
    listBucketFileEntries(admin, "chat-media"),
    listR2Media().catch(() => [])
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

  const orphanPostMedia = postMediaFiles.filter((file) => !usedPostMedia.has(file.path));
  const orphanChatMedia = chatMediaFiles.filter((file) => !usedChatMedia.has(file.path));
  const orphanR2Media = r2Files
    .filter((file) => !usedR2Media.has(file.storagePath))
    .map((file) => ({
      path: file.storagePath,
      sizeBytes: file.sizeBytes ?? 0
    }));

  const totalCount = orphanPostMedia.length + orphanChatMedia.length + orphanR2Media.length;
  const totalBytes = [...orphanPostMedia, ...orphanChatMedia, ...orphanR2Media].reduce(
    (sum, file) => sum + file.sizeBytes,
    0
  );

  return {
    postMedia: orphanPostMedia,
    chatMedia: orphanChatMedia,
    r2Media: orphanR2Media,
    totalCount,
    totalBytes
  };
}

export async function cleanupOrphanedStorage(admin: SupabaseClient): Promise<CleanupResult> {
  const report = await getOrphanedStorageReport(admin);

  return {
    postMedia: report.postMedia.length,
    chatMedia: report.chatMedia.length,
    r2Media: report.r2Media.length
  };
}
