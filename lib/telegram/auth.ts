import { createHmac, randomUUID } from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  getTelegramBotToken,
  getTelegramInitDataMaxAgeSeconds,
  isTelegramAdminUser
} from "@/lib/telegram/env";
import { readTelegramSession } from "@/lib/telegram/session";
import { Profile } from "@/lib/types";

type TelegramInitUser = {
  id: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
};

type ValidatedTelegramInitData = {
  user: TelegramInitUser;
  startParam: string | null;
};

export type TelegramAuthResult = {
  profile: Profile;
  telegramId: string;
  isAdmin: boolean;
};

function buildDataCheckString(params: URLSearchParams) {
  return [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function validateInitDataHash(initData: string): ValidatedTelegramInitData {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    throw new Error("Missing Telegram initData hash.");
  }

  const secretKey = createHmac("sha256", "WebAppData").update(getTelegramBotToken()).digest();
  const dataCheckString = buildDataCheckString(params);
  const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computed !== hash) {
    throw new Error("Telegram initData hash mismatch.");
  }

  const authDate = Number(params.get("auth_date") || 0);
  const maxAge = getTelegramInitDataMaxAgeSeconds();

  if (!authDate || Math.floor(Date.now() / 1000) - authDate > maxAge) {
    throw new Error("Telegram initData is expired.");
  }

  const rawUser = params.get("user");

  if (!rawUser) {
    throw new Error("Telegram initData is missing user.");
  }

  return {
    user: JSON.parse(rawUser) as TelegramInitUser,
    startParam: params.get("start_param")
  };
}

function buildTelegramEmail(telegramId: string) {
  return `tg-${telegramId}@telegram.local`;
}

function extractTelegramIdFromContact(contact: string | null | undefined) {
  if (!contact) {
    return null;
  }

  const match = contact.match(/Telegram ID:\s*([0-9]+)/i);
  return match?.[1] ?? null;
}

async function findApprovedPurchaseRequest(telegramId: string) {
  if (!telegramId) {
    return null;
  }

  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("purchase_requests")
    .select("tier, approved_for_club, contact")
    .eq("approved_for_club", true)
    .order("created_at", { ascending: false })
    .limit(200);

  return (data ?? []).find((request) => extractTelegramIdFromContact(request.contact) === telegramId) ?? null;
}

function parseInviteCodeFromStartParam(startParam: string | null) {
  if (!startParam) {
    return null;
  }

  const trimmed = startParam.trim();

  if (!trimmed) {
    return null;
  }

  const prefixed = trimmed.match(/^invite[-_:]?(.+)$/i);
  const rawCode = prefixed?.[1] ?? trimmed;
  const normalized = rawCode.trim().toUpperCase();

  return normalized.startsWith("VIP-") ? normalized : null;
}

async function findOrCreateAuthUserId(telegramId: string) {
  const admin = createAdminSupabaseClient();
  const email = buildTelegramEmail(telegramId);
  const created = await admin.auth.admin.createUser({
    email,
    password: randomUUID(),
    email_confirm: true,
    user_metadata: {
      telegram_id: telegramId,
      auth_source: "telegram"
    }
  });

  if (created.data.user?.id) {
    return created.data.user.id;
  }

  const listed = await admin.auth.admin.listUsers();
  const existing = listed.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());

  if (!existing?.id) {
    throw new Error(created.error?.message || "Unable to create Telegram auth user.");
  }

  return existing.id;
}

async function activateInviteForTelegramProfile(profile: Profile, inviteCode: string) {
  const admin = createAdminSupabaseClient();
  const { data: invite } = await admin
    .from("invites")
    .select("id, code, assigned_tier, used_at, used_by, disabled_at, expires_at")
    .eq("code", inviteCode)
    .maybeSingle();

  if (!invite) {
    return profile;
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return profile;
  }

  const inviteAlreadyClaimedByCurrentProfile = invite.used_by === profile.id;

  if ((invite.used_at || invite.disabled_at) && !inviteAlreadyClaimedByCurrentProfile) {
    return profile;
  }

  if (!inviteAlreadyClaimedByCurrentProfile) {
    const claimedAt = new Date().toISOString();
    const { data: claimedInvite } = await admin
      .from("invites")
      .update({
        used_at: claimedAt,
        disabled_at: claimedAt,
        used_by: profile.id
      })
      .eq("id", invite.id)
      .is("used_at", null)
      .is("disabled_at", null)
      .select("id")
      .maybeSingle();

    if (!claimedInvite) {
      return profile;
    }
  }

  const nextRole = profile.role === "admin" ? "admin" : profile.role;
  const { data: updatedProfile, error } = await admin
    .from("profiles")
    .update({
      role: nextRole,
      tier: invite.assigned_tier,
      access_status: "active"
    })
    .eq("id", profile.id)
    .select("*")
    .single();

  if (error || !updatedProfile) {
    return profile;
  }

  return updatedProfile as Profile;
}

export async function upsertTelegramProfile(initData: string): Promise<TelegramAuthResult> {
  const { user, startParam } = validateInitDataHash(initData);
  const telegramId = String(user.id);
  const admin = createAdminSupabaseClient();
  const username = user.username ?? null;
  const approvedRequest = await findApprovedPurchaseRequest(telegramId);
  const inviteCode = parseInviteCodeFromStartParam(startParam);
  const shouldBeAdmin = isTelegramAdminUser({
    telegramId,
    username
  });

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (existingProfile) {
    const nextRole = existingProfile.role === "admin" || shouldBeAdmin ? "admin" : existingProfile.role;
    const nextAccessStatus =
      nextRole === "admin" || approvedRequest ? "active" : existingProfile.access_status;
    const nextTier = approvedRequest?.tier ?? existingProfile.tier;
    const fallbackDisplayName =
      existingProfile.display_name ||
      [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
      user.username ||
      "Telegram user";
    const { data: updatedProfile, error } = await admin
      .from("profiles")
      .update({
        display_name: fallbackDisplayName,
        role: nextRole,
        tier: nextTier,
        access_status: nextAccessStatus,
        telegram_username: username,
        telegram_photo_url: user.photo_url ?? null,
        telegram_first_name: user.first_name ?? null,
        telegram_last_name: user.last_name ?? null,
        auth_source: "telegram"
      })
      .eq("id", existingProfile.id)
      .select("*")
      .single();

    if (error || !updatedProfile) {
      throw new Error(error?.message || "Unable to update Telegram profile.");
    }

    const nextProfile = inviteCode
      ? await activateInviteForTelegramProfile(updatedProfile as Profile, inviteCode)
      : (updatedProfile as Profile);

    return {
      profile: nextProfile,
      telegramId,
      isAdmin: nextProfile.role === "admin"
    };
  }

  const authUserId = await findOrCreateAuthUserId(telegramId);
  const fallbackDisplayName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.username || "Telegram user";
  const email = buildTelegramEmail(telegramId);
  const nextRole = shouldBeAdmin ? "admin" : "member";
  const nextTier = approvedRequest?.tier ?? "tier_1";
  const nextAccessStatus = nextRole === "admin" || approvedRequest ? "active" : "disabled";
  const { data: insertedProfile, error } = await admin
    .from("profiles")
    .insert({
      id: authUserId,
      email,
      display_name: fallbackDisplayName,
      role: nextRole,
      tier: nextTier,
      access_status: nextAccessStatus,
      auth_source: "telegram",
      telegram_id: telegramId,
      telegram_username: username,
      telegram_photo_url: user.photo_url ?? null,
      telegram_first_name: user.first_name ?? null,
      telegram_last_name: user.last_name ?? null
    })
    .select("*")
    .single();

  if (error || !insertedProfile) {
    throw new Error(error?.message || "Unable to create Telegram profile.");
  }

  const nextProfile = inviteCode
    ? await activateInviteForTelegramProfile(insertedProfile as Profile, inviteCode)
    : (insertedProfile as Profile);

  return {
    profile: nextProfile,
    telegramId,
    isAdmin: nextProfile.role === "admin"
  };
}

export async function getTelegramProfileFromSession() {
  const session = await readTelegramSession();

  if (!session) {
    return null;
  }

  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("profiles")
    .select("*")
    .eq("id", session.profileId)
    .eq("telegram_id", session.telegramId)
    .maybeSingle();

  return (data as Profile | null) ?? null;
}
