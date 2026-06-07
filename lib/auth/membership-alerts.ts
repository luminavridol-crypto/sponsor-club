import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Profile } from "@/lib/types";
import { isAccessExpired } from "./access";

export type MembershipAlertKind = "expires_7_days" | "expires_3_days" | "access_disabled";

export type MembershipAlert = {
  kind: MembershipAlertKind;
  title: string;
  message: string;
  daysLeft: number | null;
  expiresAt: string | null;
};

function getDaysLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function getMembershipAlert(profile: Pick<Profile, "role" | "access_status" | "access_expires_at">): MembershipAlert | null {
  if (profile.role === "admin") {
    return null;
  }

  if (profile.access_status === "disabled") {
    return {
      kind: "access_disabled",
      title: "Тариф отключён",
      message: "Доступ к закрытому клубу сейчас остановлен. Если хочешь вернуться, продли доступ на странице поддержки.",
      daysLeft: 0,
      expiresAt: profile.access_expires_at
    };
  }

  if (!profile.access_expires_at) {
    return null;
  }

  if (isAccessExpired(profile.access_expires_at)) {
    return {
      kind: "access_disabled",
      title: "Тариф отключён",
      message: "Доступ к закрытому клубу сейчас остановлен. Если хочешь вернуться, продли доступ на странице поддержки.",
      daysLeft: 0,
      expiresAt: profile.access_expires_at
    };
  }

  const daysLeft = getDaysLeft(profile.access_expires_at);

  if (daysLeft <= 3) {
    return {
      kind: "expires_3_days",
      title: "Осталось 3 дня",
      message: "Твой текущий тариф скоро закончится. Лучше продлить доступ заранее, чтобы не потерять материалы клуба.",
      daysLeft,
      expiresAt: profile.access_expires_at
    };
  }

  if (daysLeft <= 7) {
    return {
      kind: "expires_7_days",
      title: "Осталось 7 дней",
      message: "Тариф подходит к концу. Если хочешь сохранить доступ ко всем материалам, продли его заранее.",
      daysLeft,
      expiresAt: profile.access_expires_at
    };
  }

  return null;
}

export async function syncExpiredProfileAccess(profile: Profile): Promise<Profile> {
  if (profile.role === "admin") {
    return profile;
  }

  if (profile.access_status !== "active" || !profile.access_expires_at || !isAccessExpired(profile.access_expires_at)) {
    return profile;
  }

  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("profiles")
    .update({
      access_status: "disabled"
    })
    .eq("id", profile.id)
    .select("*")
    .single();

  return (data as Profile | null) ?? { ...profile, access_status: "disabled" };
}

export async function disableExpiredProfiles() {
  const admin = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "member")
    .eq("access_status", "active")
    .not("access_expires_at", "is", null)
    .lte("access_expires_at", nowIso);

  const ids = (profiles ?? []).map((profile) => profile.id);

  if (!ids.length) {
    return { updatedCount: 0 };
  }

  await admin.from("profiles").update({ access_status: "disabled" }).in("id", ids);

  return {
    updatedCount: ids.length
  };
}
