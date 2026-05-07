export type EmailDeliveryMode = "smtp" | "log";

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parsePort(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getEmailConfig() {
  const host = process.env.EMAIL_SMTP_HOST?.trim() ?? "";
  const from = process.env.EMAIL_FROM?.trim() ?? "Lumina <no-reply@localhost>";

  return {
    mode: host ? ("smtp" as EmailDeliveryMode) : ("log" as EmailDeliveryMode),
    host,
    port: parsePort(process.env.EMAIL_SMTP_PORT, 587),
    secure: parseBoolean(process.env.EMAIL_SMTP_SECURE, false),
    user: process.env.EMAIL_SMTP_USER?.trim() ?? "",
    pass: process.env.EMAIL_SMTP_PASS?.trim() ?? "",
    from,
    replyTo: process.env.EMAIL_REPLY_TO?.trim() ?? "",
    outboxDir: process.env.EMAIL_OUTBOX_DIR?.trim() ?? ".local/email-outbox",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "http://localhost:3000"
  };
}

export function hasSmtpTransport() {
  return Boolean(process.env.EMAIL_SMTP_HOST?.trim());
}
