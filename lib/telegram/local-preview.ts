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

export function buildLocalPreviewProfile(): Profile {
  const now = new Date().toISOString();

  return {
    id: "local-preview-admin",
    email: "preview@localhost",
    display_name: "Preview Admin",
    nickname: "preview",
    role: "admin",
    tier: "tier_4",
    access_status: "active",
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
    admin_note: "Temporary localhost admin preview profile.",
    admin_badges: [],
    total_donations: 50,
    access_expires_at: null,
    last_content_seen_at: now,
    created_at: now
  };
}
