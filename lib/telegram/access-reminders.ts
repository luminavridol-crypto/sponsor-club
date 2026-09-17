import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Profile } from "@/lib/types";
import { getMembershipAlert, MembershipAlert } from "@/lib/auth/membership-alerts";
import { buildTelegramPathUrl, sendTelegramMessage } from "./notifications";

type ReminderKind = MembershipAlert["kind"];

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_TIME_ZONE = "Europe/Kyiv";

function getCalendarDayNumber(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REMINDER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day")) / DAY_MS;
}

function formatExpiryDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: REMINDER_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(value);
}

function formatDays(days: number) {
  const absolute = Math.abs(days);
  const mod100 = absolute % 100;
  const mod10 = absolute % 10;
  const suffix = mod100 >= 11 && mod100 <= 14 ? "дней" : mod10 === 1 ? "день" : mod10 >= 2 && mod10 <= 4 ? "дня" : "дней";
  return `${days} ${suffix}`;
}

export function buildTelegramAccessReminder(
  profile: Pick<Profile, "access_status" | "access_expires_at">,
  reminderKind: ReminderKind,
  now = new Date()
) {
  if (!profile.access_expires_at) return null;

  const expiresAt = new Date(profile.access_expires_at);
  const formattedDate = formatExpiryDate(expiresAt);
  const daysLeft = getCalendarDayNumber(expiresAt) - getCalendarDayNumber(now);
  const hasEnded = expiresAt.getTime() <= now.getTime();
  const needsRestore = hasEnded || profile.access_status === "disabled" || reminderKind === "access_disabled";
  let firstLine: string;

  if (hasEnded) {
    firstLine = `Твой доступ к Lumina Club закончился ${formattedDate}.`;
  } else if (profile.access_status === "disabled" || reminderKind === "access_disabled") {
    firstLine = `Твой доступ к Lumina Club сейчас отключён. Дата окончания текущего периода — ${formattedDate}.`;
  } else if (daysLeft === 1) {
    firstLine = `Твой доступ к Lumina Club закончится завтра — ${formattedDate}.`;
  } else if (daysLeft === 0) {
    firstLine = `Твой доступ к Lumina Club закончится сегодня — ${formattedDate}.`;
  } else {
    firstLine = `Твой доступ к Lumina Club закончится через ${formatDays(daysLeft)} — ${formattedDate}.`;
  }

  return {
    daysLeft,
    text: `${firstLine}\n${needsRestore ? "Чтобы снова открыть материалы клуба" : "Если хочешь сохранить доступ к материалам клуба"}, подай заявку на продление.`,
    buttonText: "Продлить доступ",
    buttonUrl: buildTelegramPathUrl("/tg/tiers")
  };
}

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

  const reminder = buildTelegramAccessReminder(profile, alert.kind);
  if (!reminder) return alert;
  const result = await sendTelegramMessage(String(profile.telegram_id), reminder.text, {
    text: reminder.buttonText,
    url: reminder.buttonUrl
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
