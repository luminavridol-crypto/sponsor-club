import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { Tier } from "@/lib/types";
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

function getStorePath() {
  return path.join(process.cwd(), ".local", "email-state.json");
}

async function ensureStateDir() {
  await mkdir(path.dirname(getStorePath()), { recursive: true });
}

export async function readEmailLocalState(): Promise<EmailLocalState> {
  await ensureStateDir();

  try {
    const raw = await readFile(getStorePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<EmailLocalState>;

    return {
      campaigns: parsed.campaigns ?? [],
      deliveries: parsed.deliveries ?? [],
      postTemplates: parsed.postTemplates ?? {},
      accessExpirySettings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.accessExpirySettings ?? {})
      },
      accessExpiryLogs: parsed.accessExpiryLogs ?? []
    };
  } catch {
    return {
      campaigns: [],
      deliveries: [],
      postTemplates: {},
      accessExpirySettings: DEFAULT_SETTINGS,
      accessExpiryLogs: []
    };
  }
}

export async function writeEmailLocalState(state: EmailLocalState) {
  await ensureStateDir();
  await writeFile(getStorePath(), JSON.stringify(state, null, 2), "utf8");
}

export async function appendStoredCampaign(
  campaign: Omit<StoredEmailCampaign, "id" | "createdAt" | "sentAt"> & { sentAt?: string }
) {
  const state = await readEmailLocalState();
  const nextCampaign: StoredEmailCampaign = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    sentAt: campaign.sentAt ?? new Date().toISOString(),
    ...campaign
  };
  state.campaigns.unshift(nextCampaign);
  await writeEmailLocalState(state);
  return nextCampaign;
}

export async function appendStoredDelivery(delivery: Omit<StoredEmailDelivery, "id" | "sentAt">) {
  const state = await readEmailLocalState();
  const nextDelivery: StoredEmailDelivery = {
    id: randomUUID(),
    sentAt: new Date().toISOString(),
    ...delivery
  };
  state.deliveries.unshift(nextDelivery);
  await writeEmailLocalState(state);
  return nextDelivery;
}

export async function saveAccessExpirySettings(
  settings: AccessExpiryEmailSettings,
  updatedBy: string | null
) {
  const state = await readEmailLocalState();
  state.accessExpirySettings = {
    ...settings,
    updatedBy,
    updatedAt: new Date().toISOString()
  };
  await writeEmailLocalState(state);
}

export async function savePostEmailTemplate(
  postId: string,
  template: {
    subject: string;
    body: string;
    updatedBy: string | null;
  }
) {
  const state = await readEmailLocalState();
  state.postTemplates[postId] = {
    subject: template.subject,
    body: template.body,
    updatedAt: new Date().toISOString(),
    updatedBy: template.updatedBy
  };
  await writeEmailLocalState(state);
  return state.postTemplates[postId];
}

export async function appendAccessExpiryLog(
  log: Omit<StoredAccessExpiryLog, "id" | "sentAt">
) {
  const state = await readEmailLocalState();
  const nextLog: StoredAccessExpiryLog = {
    id: randomUUID(),
    sentAt: new Date().toISOString(),
    ...log
  };
  state.accessExpiryLogs.unshift(nextLog);
  await writeEmailLocalState(state);
  return nextLog;
}
