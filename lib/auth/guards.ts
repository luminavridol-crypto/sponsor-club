import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { hasClubAccess } from "@/lib/auth/access";
import { hasApprovedPurchasedPosts } from "@/lib/data/post-purchases";
import { syncExpiredProfileAccess } from "@/lib/auth/membership-alerts";
import { getTelegramProfileFromSession } from "@/lib/telegram/auth";
import { isLocalTelegramPreviewEnabled, resolveLocalPreviewProfile } from "@/lib/telegram/local-preview";
import { clearTelegramSession } from "@/lib/telegram/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";
import { normalizeProfileTier } from "@/lib/utils/tier";

export async function requireSession() {
  if (await isLocalTelegramPreviewEnabled()) {
    return { id: (await resolveLocalPreviewProfile()).id };
  }

  const telegramProfile = await getTelegramProfileFromSession();

  if (telegramProfile) {
    return { id: telegramProfile.id };
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
  if (await isLocalTelegramPreviewEnabled()) {
    return resolveLocalPreviewProfile();
  }

  const telegramProfile = await getTelegramProfileFromSession();

  if (telegramProfile) {
    return telegramProfile;
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

  return syncExpiredProfileAccess(normalizeProfileTier(typedProfile));
}

export async function requireProfile() {
  const profile = await requireAnyProfile();

  if (!hasClubAccess(profile)) {
    redirect("/tg/support");
  }

  return profile;
}

export async function requireContentProfile() {
  const profile = await requireAnyProfile();

  if (!hasClubAccess(profile) && !(await hasApprovedPurchasedPosts(profile))) {
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
