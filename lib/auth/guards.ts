import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { hasClubAccess } from "@/lib/auth/access";
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

export async function requireAnyProfile() {
  noStore();
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
    redirect("/login?error=1");
  }

  return typedProfile;
}

export async function requireProfile() {
  const profile = await requireAnyProfile();

  if (!hasClubAccess(profile)) {
    redirect("/");
  }

  return profile;
}

export async function requireAdmin() {
  const profile = await requireAnyProfile();

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  return profile;
}
