import type { Tier } from "@/lib/types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { AccessExpiryEmailSettings } from "./access-reminders";
import type { EmailCampaignKind, EmailDeliveryStatus } from "./service";

export type StoredEmailCampaign = {
  id: string;
  kind: EmailCampaignKind;
  title: string;
  subject: string;
  body: string;
  postId: string | null;
  targetScope: string;
  targetTiers: Tier[];
  metadata: Record<string, unknown>;
  createdBy: string;
  sentAt: string;
  createdAt: string;
};

export type StoredEmailDelivery = {
  id: string;
  campaignId: string;
  profileId: string | null;
  email: string;
  status: EmailDeliveryStatus;
  provider: string;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  sentAt: string;
};

export type StoredAccessExpiryLog = {
  id: string;
  profileId: string;
  expiresAt: string;
  daysBefore: number;
  deliveryId: string;
  sentAt: string;
};

type EmailLocalState = {
  campaigns: StoredEmailCampaign[];
  deliveries: StoredEmailDelivery[];
  postTemplates: Record<
    string,
    {
      subject: string;
      body: string;
      updatedAt: string;
      updatedBy: string | null;
    }
  >;
  accessExpirySettings: AccessExpiryEmailSettings & {
    updatedBy: string | null;
    updatedAt: string | null;
  };
  accessExpiryLogs: StoredAccessExpiryLog[];
};

const DEFAULT_SETTINGS: EmailLocalState["accessExpirySettings"] = {
  enabled: true,
  daysBefore: [7, 3, 1],
  subject: "Скоро закончится доступ в клуб Lumina",
  body:
    "Привет, {{name}}!\n\nТвой доступ к закрытому клубу Lumina закончится через {{days_left}} дн.\nДата окончания: {{expires_at}}.\n\nЕсли хочешь продлить доступ, ответь на это письмо или напиши мне удобным способом.\n\nВойти в клуб: {{club_url}}",
  updatedBy: null,
  updatedAt: null
};

type CampaignRow = {
  id: string;
  kind: EmailCampaignKind;
  title: string;
  subject: string;
  body: string;
  post_id: string | null;
  target_scope: string;
  target_tiers: string[] | null;
  metadata: Record<string, unknown> | null;
  created_by: string;
  sent_at: string | null;
  created_at: string;
};

type DeliveryRow = {
  id: string;
  campaign_id: string;
  profile_id: string | null;
  email: string;
  status: EmailDeliveryStatus;
  provider: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  sent_at: string;
};

type TemplateRow = {
  post_id: string;
  subject: string;
  body: string;
  updated_at: string;
  updated_by: string | null;
};

type SettingsRow = {
  enabled: boolean;
  days_before: number[] | null;
  subject: string;
  body: string;
  updated_at: string;
  updated_by: string | null;
};

type AccessExpiryLogRow = {
  id: string;
  profile_id: string;
  expires_at: string;
  days_before: number;
  delivery_id: string | null;
  sent_at: string;
};

function mapCampaign(row: CampaignRow): StoredEmailCampaign {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    subject: row.subject,
    body: row.body,
    postId: row.post_id,
    targetScope: row.target_scope,
    targetTiers: ((row.target_tiers ?? []) as Tier[]),
    metadata: row.metadata ?? {},
    createdBy: row.created_by,
    sentAt: row.sent_at ?? row.created_at,
    createdAt: row.created_at
  };
}

function mapDelivery(row: DeliveryRow): StoredEmailDelivery {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    profileId: row.profile_id,
    email: row.email,
    status: row.status,
    provider: row.provider ?? "",
    errorMessage: row.error_message,
    metadata: row.metadata ?? {},
    sentAt: row.sent_at
  };
}

function mapAccessExpiryLog(row: AccessExpiryLogRow): StoredAccessExpiryLog {
  return {
    id: row.id,
    profileId: row.profile_id,
    expiresAt: row.expires_at,
    daysBefore: row.days_before,
    deliveryId: row.delivery_id ?? "",
    sentAt: row.sent_at
  };
}

export async function readEmailLocalState(): Promise<EmailLocalState> {
  const admin = createAdminSupabaseClient();

  const [
    campaignsResult,
    deliveriesResult,
    templatesResult,
    settingsResult,
    logsResult
  ] = await Promise.all([
    admin
      .from("email_campaigns")
      .select("id, kind, title, subject, body, post_id, target_scope, target_tiers, metadata, created_by, sent_at, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("email_deliveries")
      .select("id, campaign_id, profile_id, email, status, provider, error_message, metadata, sent_at")
      .order("sent_at", { ascending: false }),
    admin
      .from("post_email_templates")
      .select("post_id, subject, body, updated_at, updated_by"),
    admin
      .from("access_expiry_email_settings")
      .select("enabled, days_before, subject, body, updated_at, updated_by")
      .eq("id", true)
      .maybeSingle(),
    admin
      .from("access_expiry_email_logs")
      .select("id, profile_id, expires_at, days_before, delivery_id, sent_at")
      .order("sent_at", { ascending: false })
  ]);

  const postTemplates = Object.fromEntries(
    ((templatesResult.data ?? []) as TemplateRow[]).map((template) => [
      template.post_id,
      {
        subject: template.subject,
        body: template.body,
        updatedAt: template.updated_at,
        updatedBy: template.updated_by
      }
    ])
  );

  const settingsRow = settingsResult.data as SettingsRow | null;

  return {
    campaigns: ((campaignsResult.data ?? []) as CampaignRow[]).map(mapCampaign),
    deliveries: ((deliveriesResult.data ?? []) as DeliveryRow[]).map(mapDelivery),
    postTemplates,
    accessExpirySettings: settingsRow
      ? {
          enabled: settingsRow.enabled,
          daysBefore: settingsRow.days_before ?? DEFAULT_SETTINGS.daysBefore,
          subject: settingsRow.subject,
          body: settingsRow.body,
          updatedAt: settingsRow.updated_at,
          updatedBy: settingsRow.updated_by
        }
      : DEFAULT_SETTINGS,
    accessExpiryLogs: ((logsResult.data ?? []) as AccessExpiryLogRow[]).map(mapAccessExpiryLog)
  };
}

export async function writeEmailLocalState() {
  return;
}

export async function appendStoredCampaign(
  campaign: Omit<StoredEmailCampaign, "id" | "createdAt" | "sentAt"> & { sentAt?: string }
) {
  const admin = createAdminSupabaseClient();
  const sentAt = campaign.sentAt ?? new Date().toISOString();
  const { data, error } = await admin
    .from("email_campaigns")
    .insert({
      kind: campaign.kind,
      title: campaign.title,
      subject: campaign.subject,
      body: campaign.body,
      post_id: campaign.postId,
      target_scope: campaign.targetScope,
      target_tiers: campaign.targetTiers,
      metadata: campaign.metadata,
      created_by: campaign.createdBy,
      sent_at: sentAt
    })
    .select("id, kind, title, subject, body, post_id, target_scope, target_tiers, metadata, created_by, sent_at, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Не удалось сохранить email-кампанию.");
  }

  return mapCampaign(data as CampaignRow);
}

export async function appendStoredDelivery(delivery: Omit<StoredEmailDelivery, "id" | "sentAt">) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("email_deliveries")
    .insert({
      campaign_id: delivery.campaignId,
      profile_id: delivery.profileId,
      email: delivery.email,
      status: delivery.status,
      provider: delivery.provider,
      error_message: delivery.errorMessage,
      metadata: delivery.metadata
    })
    .select("id, campaign_id, profile_id, email, status, provider, error_message, metadata, sent_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Не удалось сохранить статус email-доставки.");
  }

  return mapDelivery(data as DeliveryRow);
}

export async function saveAccessExpirySettings(
  settings: AccessExpiryEmailSettings,
  updatedBy: string | null
) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("access_expiry_email_settings").upsert(
    {
      id: true,
      enabled: settings.enabled,
      days_before: settings.daysBefore,
      subject: settings.subject,
      body: settings.body,
      updated_by: updatedBy,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function savePostEmailTemplate(
  postId: string,
  template: {
    subject: string;
    body: string;
    updatedBy: string | null;
  }
) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("post_email_templates")
    .upsert(
      {
        post_id: postId,
        subject: template.subject,
        body: template.body,
        updated_by: template.updatedBy,
        updated_at: new Date().toISOString()
      },
      { onConflict: "post_id" }
    )
    .select("post_id, subject, body, updated_at, updated_by")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Не удалось сохранить шаблон email.");
  }

  return {
    subject: data.subject,
    body: data.body,
    updatedAt: data.updated_at,
    updatedBy: data.updated_by
  };
}

export async function appendAccessExpiryLog(
  log: Omit<StoredAccessExpiryLog, "id" | "sentAt">
) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("access_expiry_email_logs")
    .insert({
      profile_id: log.profileId,
      expires_at: log.expiresAt,
      days_before: log.daysBefore,
      delivery_id: log.deliveryId || null
    })
    .select("id, profile_id, expires_at, days_before, delivery_id, sent_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Не удалось сохранить лог напоминания.");
  }

  return mapAccessExpiryLog(data as AccessExpiryLogRow);
}
