import { headers } from "next/headers";
import { Profile } from "@/lib/types";

export const LOCAL_PREVIEW_ADMIN_ID = "00000000-0000-4000-8000-000000000301";
export const LOCAL_PREVIEW_MEMBER_ID = "00000000-0000-4000-8000-000000000101";

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

type PreviewOverrides = Partial<
  Pick<Profile, "role" | "tier" | "access_status" | "access_expires_at" | "display_name">
>;

function getPreviewOverridesForHost(host: string | null): PreviewOverrides {
  if (!host) {
    return {};
  }

  if (host.includes(":3003")) {
    return {
      role: "admin",
      tier: "tier_4",
      access_status: "active",
      access_expires_at: null,
      display_name: "Admin Preview"
    };
  }

  if (host.includes(":3002")) {
    return {
      role: "member",
      tier: "tier_1",
      access_status: "disabled",
      access_expires_at: null,
      display_name: "Guest Preview"
    };
  }

  if (host.includes(":3001")) {
    return {
      role: "member",
      tier: "tier_1",
      access_status: "active",
      access_expires_at: null,
      display_name: "Наблюдатель Preview"
    };
  }

  return {};
}

function getPreviewRole(overrides?: PreviewOverrides): Profile["role"] {
  if (overrides?.role) {
    return overrides.role;
  }

  return process.env.LOCAL_TELEGRAM_PREVIEW_ROLE === "admin" ? "admin" : "member";
}

function getPreviewTier(role: Profile["role"], overrides?: PreviewOverrides): Profile["tier"] {
  if (overrides?.tier) {
    return overrides.tier;
  }

  const tier = process.env.LOCAL_TELEGRAM_PREVIEW_TIER;
  if (tier === "tier_1" || tier === "tier_2" || tier === "tier_3" || tier === "tier_4") {
    return tier;
  }

  return role === "admin" ? "tier_4" : "tier_1";
}

function getPreviewAccessStatus(overrides?: PreviewOverrides): Profile["access_status"] {
  if (overrides?.access_status) {
    return overrides.access_status;
  }

  return process.env.LOCAL_TELEGRAM_PREVIEW_ACCESS_STATUS === "active" ? "active" : "disabled";
}

function getPreviewAccessExpiresAt(overrides?: PreviewOverrides) {
  if (overrides && "access_expires_at" in overrides) {
    return overrides.access_expires_at ?? null;
  }

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

export function buildLocalPreviewProfile(overrides?: PreviewOverrides): Profile {
  const now = new Date().toISOString();
  const role = getPreviewRole(overrides);
  const tier = getPreviewTier(role, overrides);
  const isAdmin = role === "admin";
  const displayName =
    overrides?.display_name ||
    process.env.LOCAL_TELEGRAM_PREVIEW_NAME?.trim() ||
    (isAdmin ? "Preview Admin" : "Preview Guest");
  const accessStatus = getPreviewAccessStatus(overrides);
  const accessExpiresAt = getPreviewAccessExpiresAt(overrides);

  return {
    id: isAdmin ? LOCAL_PREVIEW_ADMIN_ID : LOCAL_PREVIEW_MEMBER_ID,
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
      : "Temporary localhost guest preview profile.",
    admin_badges: [],
    total_donations: isAdmin ? 50 : 0,
    access_expires_at: accessExpiresAt,
    last_content_seen_at: now,
    created_at: now
  };
}

export async function resolveLocalPreviewProfile() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");
  return buildLocalPreviewProfile(getPreviewOverridesForHost(host));
}
