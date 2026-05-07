import { mkdir, writeFile } from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";
import { Tier } from "@/lib/types";
import { appendStoredCampaign, appendStoredDelivery } from "./local-store";
import { getEmailConfig } from "./config";

export type EmailCampaignKind = "post" | "manual" | "expiry";
export type EmailDeliveryStatus = "sent" | "logged" | "failed" | "skipped";

export type EmailRecipient = {
  profileId: string | null;
  email: string;
  displayName?: string | null;
  tier?: Tier | null;
  accessExpiresAt?: string | null;
  daysLeft?: number | null;
};

export type CampaignDeliveryResult = {
  deliveryId: string;
  profileId: string | null;
  email: string;
  status: EmailDeliveryStatus;
  provider: string;
  errorMessage: string | null;
};

type SendEmailCampaignInput = {
  kind: EmailCampaignKind;
  title: string;
  subject: string;
  body: string;
  postId?: string | null;
  targetScope: string;
  targetTiers?: Tier[];
  createdBy: string;
  recipients: EmailRecipient[];
  metadata?: Record<string, unknown>;
};

type DeliveryPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type DeliveryAttemptResult = {
  status: "sent" | "logged" | "failed";
  provider: string;
  errorMessage: string | null;
};

function tierLabel(tier?: Tier | null) {
  switch (tier) {
    case "tier_1":
      return "Tier 1";
    case "tier_2":
      return "Tier 2";
    case "tier_3":
      return "VIP";
    default:
      return "участник клуба";
  }
}

function formatDate(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function replaceTemplateTokens(template: string, recipient: EmailRecipient) {
  return template
    .replaceAll("{{name}}", recipient.displayName?.trim() || recipient.email)
    .replaceAll("{{email}}", recipient.email)
    .replaceAll("{{tier}}", tierLabel(recipient.tier))
    .replaceAll("{{expires_at}}", formatDate(recipient.accessExpiresAt) || "скоро")
    .replaceAll("{{days_left}}", String(recipient.daysLeft ?? "несколько"))
    .replaceAll("{{club_url}}", `${getEmailConfig().siteUrl}/club`);
}

function renderHtml(subject: string, text: string) {
  const paragraphs = text
    .split("\n\n")
    .map((part) => `<p style="margin:0 0 16px;line-height:1.7;">${part.replaceAll("\n", "<br/>")}</p>`)
    .join("");

  return `<!doctype html>
<html lang="ru">
  <body style="margin:0;padding:32px;background:#0b0b12;color:#f5f5f7;font-family:Arial,sans-serif;">
    <div style="max-width:680px;margin:0 auto;border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:32px;background:linear-gradient(180deg,#181824 0%,#0e0f16 100%);">
      <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;color:#7ae8ff;">Lumina</p>
      <h1 style="margin:0 0 20px;font-size:28px;line-height:1.2;color:#ffffff;">${subject}</h1>
      ${paragraphs}
    </div>
  </body>
</html>`;
}

async function deliverEmail(payload: DeliveryPayload): Promise<DeliveryAttemptResult> {
  const config = getEmailConfig();

  if (config.mode === "smtp") {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined
    });

    await transporter.sendMail({
      from: config.from,
      replyTo: config.replyTo || undefined,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html
    });

    return {
      status: "sent" as const,
      provider: "smtp",
      errorMessage: null
    };
  }

  const outboxDir = path.isAbsolute(config.outboxDir)
    ? config.outboxDir
    : path.join(process.cwd(), config.outboxDir);

  await mkdir(outboxDir, { recursive: true });
  const safeEmail = payload.to.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path.join(outboxDir, `${Date.now()}-${safeEmail}.json`);

  await writeFile(
    filePath,
    JSON.stringify(
      {
        ...payload,
        from: config.from,
        replyTo: config.replyTo || null,
        createdAt: new Date().toISOString()
      },
      null,
      2
    ),
    "utf8"
  );

  return {
    status: "logged" as const,
    provider: "local-log",
    errorMessage: null
  };
}

export async function sendEmailCampaign(input: SendEmailCampaignInput) {
  const uniqueRecipients = [...new Map(input.recipients.map((item) => [item.email.toLowerCase(), item])).values()];
  const campaign = await appendStoredCampaign({
    kind: input.kind,
    title: input.title,
    subject: input.subject,
    body: input.body,
    postId: input.postId ?? null,
    targetScope: input.targetScope,
    targetTiers: input.targetTiers ?? [],
    metadata: {
      ...(input.metadata ?? {}),
      recipients: uniqueRecipients.length
    },
    createdBy: input.createdBy
  });

  const deliveries: CampaignDeliveryResult[] = [];

  for (const recipient of uniqueRecipients) {
    const subject = replaceTemplateTokens(input.subject, recipient);
    const text = replaceTemplateTokens(input.body, recipient);
    const html = renderHtml(subject, text);

    let result: DeliveryAttemptResult;

    try {
      result = await deliverEmail({
        to: recipient.email,
        subject,
        text,
        html
      });
    } catch (error) {
      result = {
        status: "failed",
        provider: "smtp",
        errorMessage: error instanceof Error ? error.message : "Не удалось отправить письмо."
      };
    }

    const delivery = await appendStoredDelivery({
      campaignId: campaign.id,
      profileId: recipient.profileId,
      email: recipient.email,
      status: result.status,
      provider: result.provider,
      errorMessage: result.errorMessage,
      metadata: {
        tier: recipient.tier ?? null,
        access_expires_at: recipient.accessExpiresAt ?? null,
        days_left: recipient.daysLeft ?? null
      }
    });

    deliveries.push({
      deliveryId: delivery.id,
      profileId: recipient.profileId,
      email: recipient.email,
      status: result.status,
      provider: result.provider,
      errorMessage: result.errorMessage
    });
  }

  return {
    campaignId: campaign.id,
    deliveries,
    sentCount: deliveries.filter((item) => item.status === "sent" || item.status === "logged").length,
    failedCount: deliveries.filter((item) => item.status === "failed").length
  };
}
