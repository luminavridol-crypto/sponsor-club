import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Tier } from "@/lib/types";
import { appendAccessExpiryLog, readEmailLocalState, saveAccessExpirySettings } from "./local-store";
import { sendEmailCampaign } from "./service";

export type AccessExpiryEmailSettings = {
  enabled: boolean;
  daysBefore: number[];
  subject: string;
  body: string;
};

const DEFAULT_SETTINGS: AccessExpiryEmailSettings = {
  enabled: true,
  daysBefore: [7, 3, 1],
  subject: "Скоро закончится доступ в клуб Lumina",
  body:
    "Привет, {{name}}!\n\nТвой доступ к закрытому клубу Lumina закончится через {{days_left}} дн.\nДата окончания: {{expires_at}}.\n\nЕсли хочешь продлить доступ, ответь на это письмо или напиши мне удобным способом.\n\nВойти в клуб: {{club_url}}"
};

type ReminderRecipient = {
  id: string;
  email: string;
  display_name: string | null;
  nickname: string | null;
  tier: Tier;
  access_expires_at: string;
};

function normalizeDaysBefore(daysBefore: number[]) {
  return [...new Set(daysBefore.filter((value) => Number.isInteger(value) && value > 0))].sort((a, b) => b - a);
}

function getDayDistance(expiresAt: string, now = new Date()) {
  const diff = new Date(expiresAt).getTime() - now.getTime();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export async function getAccessExpiryEmailSettings() {
  const state = await readEmailLocalState();

  return {
    enabled: state.accessExpirySettings.enabled ?? DEFAULT_SETTINGS.enabled,
    daysBefore: normalizeDaysBefore(state.accessExpirySettings.daysBefore ?? DEFAULT_SETTINGS.daysBefore),
    subject: state.accessExpirySettings.subject || DEFAULT_SETTINGS.subject,
    body: state.accessExpirySettings.body || DEFAULT_SETTINGS.body
  };
}

export async function updateAccessExpiryEmailSettings(settings: AccessExpiryEmailSettings, updatedBy: string) {
  await saveAccessExpirySettings(
    {
      enabled: settings.enabled,
      daysBefore: normalizeDaysBefore(settings.daysBefore),
      subject: settings.subject,
      body: settings.body
    },
    updatedBy
  );
}

export async function runAutomaticAccessExpiryReminders(triggeredBy?: string | null) {
  const settings = await getAccessExpiryEmailSettings();

  if (!settings.enabled || !settings.daysBefore.length) {
    return { sentCount: 0, failedCount: 0 };
  }

  const admin = createAdminSupabaseClient();
  const maxDays = Math.max(...settings.daysBefore);
  const now = new Date();
  const latestDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, display_name, nickname, tier, access_expires_at")
    .eq("role", "member")
    .eq("access_status", "active")
    .not("access_expires_at", "is", null)
    .gt("access_expires_at", now.toISOString())
    .lte("access_expires_at", latestDate)
    .order("access_expires_at", { ascending: true });

  const recipients = (profiles ?? []) as ReminderRecipient[];
  let createdBy = triggeredBy ?? null;

  if (!createdBy) {
    const { data: adminProfile } = await admin.from("profiles").select("id").eq("role", "admin").limit(1).maybeSingle();
    createdBy = adminProfile?.id ?? null;
  }

  if (!createdBy) {
    return { sentCount: 0, failedCount: 0 };
  }

  const state = await readEmailLocalState();
  let totalSent = 0;
  let totalFailed = 0;

  for (const daysBefore of settings.daysBefore) {
    const candidates = recipients.filter((recipient) => getDayDistance(recipient.access_expires_at, now) === daysBefore);

    if (!candidates.length) {
      continue;
    }

    const eligibleRecipients = candidates
      .filter(
        (recipient) =>
          !state.accessExpiryLogs.some(
            (log) =>
              log.profileId === recipient.id &&
              log.expiresAt === recipient.access_expires_at &&
              log.daysBefore === daysBefore
          )
      )
      .map((recipient) => ({
        profileId: recipient.id,
        email: recipient.email,
        displayName: recipient.display_name || recipient.nickname || recipient.email,
        tier: recipient.tier,
        accessExpiresAt: recipient.access_expires_at,
        daysLeft: daysBefore
      }));

    if (!eligibleRecipients.length) {
      continue;
    }

    const result = await sendEmailCampaign({
      kind: "expiry",
      title: `Автонапоминание о доступе за ${daysBefore} дн.`,
      subject: settings.subject,
      body: settings.body,
      targetScope: "expiring_soon",
      createdBy,
      recipients: eligibleRecipients,
      metadata: {
        days_before: daysBefore,
        automatic: true
      }
    });

    totalSent += result.sentCount;
    totalFailed += result.failedCount;

    for (const delivery of result.deliveries) {
      if (delivery.status !== "sent" && delivery.status !== "logged") {
        continue;
      }

      const recipient = eligibleRecipients.find((item) => item.profileId === delivery.profileId);

      if (!recipient?.profileId || !recipient.accessExpiresAt) {
        continue;
      }

      await appendAccessExpiryLog({
        profileId: recipient.profileId,
        expiresAt: recipient.accessExpiresAt,
        daysBefore,
        deliveryId: delivery.deliveryId
      });
    }
  }

  return {
    sentCount: totalSent,
    failedCount: totalFailed
  };
}
