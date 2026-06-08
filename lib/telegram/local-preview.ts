import { headers } from "next/headers";
import { Profile } from "@/lib/types";

function isLocalHost(host: string | null) {
  if (!host) {
    return false;
  }

  return host.includes("localhost") || host.includes("127.0.0.1");
}

export async function isLocalTelegramPreviewEnabled() {
  if (process.env.LOCAL_TELEGRAM_PREVIEW === "1") {
    return true;
  }

  const headerStore = await headers();
  const explicitPreview = headerStore.get("x-local-preview");

  if (explicitPreview === "1") {
    return true;
  }

  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");

  return isLocalHost(host);
}

function getPreviewRole(): Profile["role"] {
  return process.env.LOCAL_TELEGRAM_PREVIEW_ROLE === "member" ? "member" : "admin";
}

function getPreviewTier(): Profile["tier"] {
  const tier = process.env.LOCAL_TELEGRAM_PREVIEW_TIER;
  if (tier === "tier_1" || tier === "tier_2" || tier === "tier_3" || tier === "tier_4") {
    return tier;
  }

  return getPreviewRole() === "admin" ? "tier_4" : "tier_1";
}

function getPreviewAccessStatus(): Profile["access_status"] {
  return process.env.LOCAL_TELEGRAM_PREVIEW_ACCESS_STATUS === "disabled" ? "disabled" : "active";
}

function getPreviewAccessExpiresAt() {
  const raw = process.env.LOCAL_TELEGRAM_PREVIEW_ACCESS_EXPIRES_AT?.trim();

  if (!raw) {
    return null;
  }

  if (/^\d+$/.test(raw)) {
    const days = Number(raw);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function buildLocalPreviewProfile(): Profile {
  const now = new Date().toISOString();
  const role = getPreviewRole();
  const tier = getPreviewTier();
  const isAdmin = role === "admin";
  const displayName = process.env.LOCAL_TELEGRAM_PREVIEW_NAME?.trim() || (isAdmin ? "Preview Admin" : "Preview User");
  const accessStatus = getPreviewAccessStatus();
  const accessExpiresAt = getPreviewAccessExpiresAt();

  return {
    id: isAdmin ? "local-preview-admin" : "local-preview-member",
    email: "preview@localhost",
    display_name: displayName,
    nickname: "preview",
    role,
    tier,
    access_status: accessStatus,
    auth_source: "telegram",
    bio: null,
    avatar_url: null,
    birth_date: null,
    telegram_id: "local-preview",
    telegram_username: "preview",
    telegram_photo_url: null,
    telegram_first_name: "Local",
    telegram_last_name: "Preview",
    telegram_contact: null,
    tiktok_contact: null,
    favorite_lumina_cosplay: "2B",
    admin_note: isAdmin
      ? "Temporary localhost admin preview profile."
      : "Temporary localhost member preview profile.",
    admin_badges: [],
    total_donations: 50,
    access_expires_at: accessExpiresAt,
    last_content_seen_at: now,
    created_at: now
  };
}
