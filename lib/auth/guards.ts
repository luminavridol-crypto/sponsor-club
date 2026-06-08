import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { hasClubAccess } from "@/lib/auth/access";
import { syncExpiredProfileAccess } from "@/lib/auth/membership-alerts";
import { getTelegramProfileFromSession } from "@/lib/telegram/auth";
import { buildLocalPreviewProfile, isLocalTelegramPreviewEnabled } from "@/lib/telegram/local-preview";
import { clearTelegramSession } from "@/lib/telegram/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";

export async function requireSession() {
  const telegramProfile = await getTelegramProfileFromSession();

  if (telegramProfile) {
    return { id: telegramProfile.id };
  }

  if (await isLocalTelegramPreviewEnabled()) {
    return { id: buildLocalPreviewProfile().id };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/tg");
  }

  return user;
}

export async function requireAnyProfile() {
  noStore();
  const telegramProfile = await getTelegramProfileFromSession();

  if (telegramProfile) {
    return telegramProfile;
  }

  if (await isLocalTelegramPreviewEnabled()) {
    return buildLocalPreviewProfile();
  }

  const user = await requireSession();
  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const typedProfile = profile as Profile | null;

  if (!typedProfile) {
    await supabase.auth.signOut();
    await clearTelegramSession();
    redirect("/tg");
  }

  return syncExpiredProfileAccess(typedProfile);
}

export async function requireProfile() {
  const profile = await requireAnyProfile();

  if (!hasClubAccess(profile)) {
    redirect("/tg/support");
  }

  return profile;
}

export async function requireAdmin() {
  const profile = await requireAnyProfile();

  if (profile.role !== "admin") {
    redirect("/tg");
  }

  return profile;
}
