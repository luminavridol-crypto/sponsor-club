import { unstable_noStore as noStore } from "next/cache";
import { getMediaUrl, isR2StoragePath } from "@/lib/storage/media";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function getSignedAvatarUrls(paths: string[]) {
  noStore();

  if (!paths.length) {
    return {};
  }

  const admin = createAdminSupabaseClient();
  const entries = await Promise.all(
    [...new Set(paths)].map(async (path) => [
      path,
      (await getMediaUrl(
        {
          provider: isR2StoragePath(path) ? "r2" : "supabase",
          storage_path: path
        },
        { supabase: admin, legacyBucket: "post-media" }
      )) ?? ""
    ] as const)
  );

  return Object.fromEntries(entries);
}
