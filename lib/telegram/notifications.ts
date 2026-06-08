import { isAccessExpired } from "@/lib/auth/access";
import { getTelegramBotToken } from "@/lib/telegram/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Tier } from "@/lib/types";
import { canAccessTier, getEffectiveTier, TIER_LABELS } from "@/lib/utils/tier";

type NotifyNewPostInput = {
  postTitle: string;
  postSlug: string;
  requiredTier: Tier;
};

type TelegramButton = {
  text: string;
  url: string;
};

type TelegramSendResult = {
  ok: boolean;
  error?: string;
};

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
}

function buildPostUrl(postSlug: string) {
  return `${getSiteUrl()}/tg/content/${postSlug}`;
}

export function buildTelegramPathUrl(pathname: string) {
  const siteUrl = getSiteUrl();
  return `${siteUrl}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  button?: TelegramButton
): Promise<TelegramSendResult> {
  try {
    const token = getTelegramBotToken();
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
        reply_markup: button
          ? {
              inline_keyboard: [[button]]
            }
          : undefined
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { description?: string };
      return { ok: false, error: payload.description || `HTTP ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Telegram error"
    };
  }
}

export async function notifyTelegramUsersAboutNewPost({
  postTitle,
  postSlug,
  requiredTier
}: NotifyNewPostInput) {
  const admin = createAdminSupabaseClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role, tier, admin_badges, access_status, access_expires_at, telegram_id")
    .not("telegram_id", "is", null);

  const eligibleProfiles = (profiles ?? []).filter((profile) => {
    if (!profile.telegram_id) return false;
    if (profile.role === "admin") return true;
    if (profile.access_status !== "active") return false;
    if (isAccessExpired(profile.access_expires_at)) return false;
    return canAccessTier(getEffectiveTier(profile), requiredTier);
  });

  const text = ["Новый пост в Lumina Club", "", postTitle, "", `Уровень: ${TIER_LABELS[requiredTier]}`].join("\n");

  let sentCount = 0;
  let failedCount = 0;

  for (const profile of eligibleProfiles) {
    const result = await sendTelegramMessage(String(profile.telegram_id), text, {
      text: "Открыть пост",
      url: buildPostUrl(postSlug)
    });

    if (result.ok) {
      sentCount += 1;
    } else {
      failedCount += 1;
      console.error("[TelegramNotify] failed to send new post notification", {
        profileId: profile.id,
        telegramId: profile.telegram_id,
        error: result.error
      });
    }
  }

  return {
    sentCount,
    failedCount
  };
}
