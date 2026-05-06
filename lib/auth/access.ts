import { Profile } from "@/lib/types";

export type ViewerKind = "guest" | "free_user" | "paid_user" | "invited_user" | "admin";

export function isAccessExpired(value: string | null | undefined) {
  return value ? new Date(value) <= new Date() : false;
}

export function hasClubAccess(profile: Profile | null | undefined) {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  return profile.access_status === "active" && !isAccessExpired(profile.access_expires_at);
}

export function getViewerKind(profile: Profile | null | undefined): ViewerKind {
  if (!profile) return "guest";
  if (profile.role === "admin") return "admin";
  if (!hasClubAccess(profile)) return "free_user";
  return Number(profile.total_donations ?? 0) > 0 ? "paid_user" : "invited_user";
}
