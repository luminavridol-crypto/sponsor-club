import { createHmac, randomUUID } from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getTelegramBotToken, getTelegramInitDataMaxAgeSeconds } from "@/lib/telegram/env";
import { readTelegramSession } from "@/lib/telegram/session";
import { Profile } from "@/lib/types";

type TelegramInitUser = {
  id: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
};

export type TelegramAuthResult = {
  profile: Profile;
  telegramId: string;
};

function buildDataCheckString(params: URLSearchParams) {
  return [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function validateInitDataHash(initData: string) {
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

  return JSON.parse(rawUser) as TelegramInitUser;
}

function buildTelegramEmail(telegramId: string) {
  return `tg-${telegramId}@telegram.local`;
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

export async function upsertTelegramProfile(initData: string): Promise<TelegramAuthResult> {
  const user = validateInitDataHash(initData);
  const telegramId = String(user.id);
  const admin = createAdminSupabaseClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (existingProfile) {
    const { data: updatedProfile, error } = await admin
      .from("profiles")
      .update({
        telegram_username: user.username ?? null,
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

    return {
      profile: updatedProfile as Profile,
      telegramId
    };
  }

  const authUserId = await findOrCreateAuthUserId(telegramId);
  const fallbackDisplayName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.username || "Telegram user";
  const email = buildTelegramEmail(telegramId);
  const { data: insertedProfile, error } = await admin
    .from("profiles")
    .insert({
      id: authUserId,
      email,
      display_name: fallbackDisplayName,
      role: "member",
      tier: "tier_1",
      access_status: "disabled",
      auth_source: "telegram",
      telegram_id: telegramId,
      telegram_username: user.username ?? null,
      telegram_photo_url: user.photo_url ?? null,
      telegram_first_name: user.first_name ?? null,
      telegram_last_name: user.last_name ?? null
    })
    .select("*")
    .single();

  if (error || !insertedProfile) {
    throw new Error(error?.message || "Unable to create Telegram profile.");
  }

  return {
    profile: insertedProfile as Profile,
    telegramId
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
