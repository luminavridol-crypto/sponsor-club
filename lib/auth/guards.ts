import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";

export async function requireSession() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireProfile() {
  noStore();
  const user = await requireSession();
  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const typedProfile = profile as Profile | null;

  const accessExpired =
    typedProfile?.access_expires_at ? new Date(typedProfile.access_expires_at) <= new Date() : false;

  if (!typedProfile || typedProfile.access_status !== "active" || accessExpired) {
    await supabase.auth.signOut();
    redirect("/login?disabled=1");
  }

  return typedProfile;
}

export async function requireAdmin() {
  const profile = await requireProfile();

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  return profile;
}
