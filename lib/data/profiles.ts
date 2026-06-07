import { unstable_cache } from "next/cache";
import { getMediaUrl, isR2StoragePath } from "@/lib/storage/media";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function getSignedAvatarUrls(paths: string[]) {
  if (!paths.length) {
    return {};
  }

  const getCachedSignedAvatarUrl = unstable_cache(
    async (path: string) => {
      const admin = createAdminSupabaseClient();
      return (
        (await getMediaUrl(
          {
            provider: isR2StoragePath(path) ? "r2" : "supabase",
            storage_path: path
          },
          { supabase: admin, legacyBucket: "post-media" }
        )) ?? ""
      );
    },
    ["signed-avatar-url"],
    {
      revalidate: 300
    }
  );

  const entries = await Promise.all(
    [...new Set(paths)].map(async (path) => [path, await getCachedSignedAvatarUrl(path)] as const)
  );

  return Object.fromEntries(entries);
}
