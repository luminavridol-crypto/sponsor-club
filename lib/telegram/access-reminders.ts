import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Profile } from "@/lib/types";
import { getMembershipAlert, MembershipAlert } from "@/lib/auth/membership-alerts";
import { buildTelegramPathUrl, sendTelegramMessage } from "./notifications";

type ReminderKind = MembershipAlert["kind"];

const REMINDER_MESSAGES: Record<ReminderKind, { text: string; buttonText: string }> = {
  expires_7_days: {
    text: "Твой тариф Lumina Club закончится через 7 дней. Если хочешь сохранить доступ ко всем материалам, продли его заранее.",
    buttonText: "Продлить доступ"
  },
  expires_3_days: {
    text: "До окончания тарифа Lumina Club осталось 3 дня. Чтобы не потерять доступ, продли его заранее.",
    buttonText: "Продлить доступ"
  },
  access_disabled: {
    text: "Твой тариф Lumina Club сейчас отключён. Чтобы снова открыть доступ к материалам клуба, продли подписку.",
    buttonText: "Открыть поддержку"
  }
};

export async function sendTelegramAccessReminderIfNeeded(profile: Profile) {
  if (!profile.telegram_id || profile.role === "admin" || profile.telegram_id === "local-preview") {
    return null;
  }

  const alert = getMembershipAlert(profile);

  if (!alert) {
    return null;
  }

  if (!profile.access_expires_at) {
    return null;
  }

  const admin = createAdminSupabaseClient();
  const { data: existingLog, error: logError } = await admin
    .from("telegram_access_reminder_logs")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("expires_at", profile.access_expires_at)
    .eq("reminder_kind", alert.kind)
    .maybeSingle();

  if (logError) {
    console.error("[TelegramReminder] reminder log lookup failed", {
      profileId: profile.id,
      reminderKind: alert.kind,
      error: logError.message
    });
    return alert;
  }

  if (existingLog) {
    return alert;
  }

  const reminder = REMINDER_MESSAGES[alert.kind];
  const result = await sendTelegramMessage(String(profile.telegram_id), reminder.text, {
    text: reminder.buttonText,
    url: buildTelegramPathUrl("/tg/support")
  });

  if (!result.ok) {
    console.error("[TelegramReminder] failed to send access reminder", {
      profileId: profile.id,
      telegramId: profile.telegram_id,
      reminderKind: alert.kind,
      error: result.error
    });
    return alert;
  }

  const { error: insertError } = await admin.from("telegram_access_reminder_logs").insert({
    profile_id: profile.id,
    expires_at: profile.access_expires_at,
    reminder_kind: alert.kind
  });

  if (insertError) {
    console.error("[TelegramReminder] reminder log insert failed", {
      profileId: profile.id,
      reminderKind: alert.kind,
      error: insertError.message
    });
  }

  return alert;
}

export async function runTelegramAccessReminderSweep() {
  const admin = createAdminSupabaseClient();
  const cutoffIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: profiles } = await admin
    .from("profiles")
    .select("*")
    .eq("role", "member")
    .not("telegram_id", "is", null)
    .not("access_expires_at", "is", null)
    .lte("access_expires_at", cutoffIso);

  let processedCount = 0;
  let alertCount = 0;

  for (const row of (profiles ?? []) as Profile[]) {
    const alert = await sendTelegramAccessReminderIfNeeded(row);
    processedCount += 1;

    if (alert) {
      alertCount += 1;
    }
  }

  return {
    processedCount,
    alertCount
  };
}
