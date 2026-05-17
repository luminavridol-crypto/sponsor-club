import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasClubAccess } from "@/lib/auth/access";
import { getTelegramProfileFromSession } from "@/lib/telegram/auth";
import { clearTelegramSession } from "@/lib/telegram/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";

function isTelegramPath(pathname: string | null) {
  return Boolean(pathname && pathname.startsWith("/tg"));
}

async function getCurrentPathname() {
  const headerStore = await headers();
  return headerStore.get("x-current-pathname");
}

export async function requireSession() {
  const telegramProfile = await getTelegramProfileFromSession();

  if (telegramProfile) {
    return { id: telegramProfile.id };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    const pathname = await getCurrentPathname();
    redirect(isTelegramPath(pathname) ? "/tg" : "/login");
  }

  return user;
}

export async function requireAnyProfile() {
  noStore();
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
    const pathname = await getCurrentPathname();
    redirect(isTelegramPath(pathname) ? "/tg" : "/login?error=1");
  }

  return typedProfile;
}

export async function requireProfile() {
  const profile = await requireAnyProfile();

  if (!hasClubAccess(profile)) {
    const pathname = await getCurrentPathname();
    redirect(isTelegramPath(pathname) ? "/tg/support" : "/");
  }

  return profile;
}

export async function requireAdmin() {
  const profile = await requireAnyProfile();

  if (profile.role !== "admin") {
    const pathname = await getCurrentPathname();
    redirect(isTelegramPath(pathname) ? "/tg" : "/dashboard");
  }

  return profile;
}
