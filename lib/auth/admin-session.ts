import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getTelegramProfileFromSession } from "@/lib/telegram/auth";

export async function requireActiveAdminSession() {
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
