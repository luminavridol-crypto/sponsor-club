import { isLocalTelegramPreviewEnabled, resolveLocalPreviewProfile } from "@/lib/telegram/local-preview";
import { getTelegramProfileFromSession } from "@/lib/telegram/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { applySubscriptionToProfile } from "@/lib/data/subscriptions";
import type { Profile } from "@/lib/types";
import { normalizeProfileTier } from "@/lib/utils/tier";

export async function resolveProfileForAuthUser(authUserId: string) {
  const admin = createAdminSupabaseClient();
  const { data: identity } = await admin
    .from("user_identities")
    .select("user_id")
    .eq("provider", "email")
    .eq("provider_subject", authUserId)
    .maybeSingle();
  const profileId = identity?.user_id ?? authUserId;
  const { data } = await admin.from("profiles").select("*").eq("id", profileId).maybeSingle();
  const profile = data as Profile | null;
  return profile ? applySubscriptionToProfile(normalizeProfileTier(profile), admin) : null;
}

export async function getCurrentProfile() {
  const telegramProfile = await getTelegramProfileFromSession();
  if (telegramProfile) return telegramProfile;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return resolveProfileForAuthUser(user.id);
  if (await isLocalTelegramPreviewEnabled()) return resolveLocalPreviewProfile();
  return null;
}

export async function getCurrentWebsiteProfile() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? resolveProfileForAuthUser(user.id) : null;
}
