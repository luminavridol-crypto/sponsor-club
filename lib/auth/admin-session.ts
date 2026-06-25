import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getTelegramProfileFromSession } from "@/lib/telegram/auth";
import { isLocalTelegramPreviewEnabled, resolveLocalPreviewProfile } from "@/lib/telegram/local-preview";

export async function requireActiveAdminSession() {
  if (await isLocalTelegramPreviewEnabled()) {
    const previewProfile = await resolveLocalPreviewProfile();

    if (previewProfile.role === "admin" && previewProfile.access_status === "active") {
      return previewProfile;
    }
  }

  const telegramProfile = await getTelegramProfileFromSession();

  if (telegramProfile?.role === "admin" && telegramProfile.access_status === "active") {
    return telegramProfile;
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, access_status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin" || profile.access_status !== "active") {
    return null;
  }

  return profile;
}
