import "server-only";
import nodemailer from "nodemailer";
import type { Tier } from "@/lib/types";
import type { AccessRequestSource, AccessRequestType } from "@/lib/requests/access-requests";
import { getEmailConfig } from "./config";
import { TIER_LABELS } from "@/lib/utils/tier";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

const REQUEST_TYPE_LABELS: Record<AccessRequestType, string> = {
  new_access: "Новый доступ",
  renewal: "Продление",
  upgrade: "Повышение тарифа"
};

export async function sendAccessRequestAdminNotification(input: {
  id: string;
  createdAt: string;
  displayName: string;
  email: string;
  telegramUsername?: string | null;
  source: AccessRequestSource;
  requestType: AccessRequestType;
  currentTier: Tier | null;
  requestedTier: Tier;
  comment: string | null;
}) {
  const config = getEmailConfig();
  const recipient = process.env.EMAIL_ADMIN_TO?.trim() || config.replyTo;
  if (config.mode !== "smtp") throw new Error("SMTP is not configured; request remains saved in admin panel");
  if (!recipient) throw new Error("EMAIL_ADMIN_TO or EMAIL_REPLY_TO is not configured");

  const adminUrl = `${config.siteUrl.replace(/\/$/, "")}/tg/admin/users?section=purchases&request=${encodeURIComponent(input.id)}`;
  const rows = [
    ["Имя", input.displayName],
    ["Email", input.email],
    ["Telegram username", input.telegramUsername ? `@${input.telegramUsername.replace(/^@/, "")}` : "не указан"],
    ["Источник", input.source === "website" ? "Website" : "Telegram"],
    ["Тип заявки", REQUEST_TYPE_LABELS[input.requestType]],
    ["Текущий тариф", input.currentTier ? TIER_LABELS[input.currentTier] : "Guest"],
    ["Запрошенный тариф", TIER_LABELS[input.requestedTier]],
    ["Дата и время", new Date(input.createdAt).toLocaleString("ru-RU", { timeZone: "Europe/Kyiv" })],
    ["Комментарий", input.comment || "не указан"],
    ["ID заявки", input.id],
    ["Admin panel", adminUrl]
  ];
  const subject = `Новая заявка Lumina Club — ${TIER_LABELS[input.requestedTier]}`;
  const text = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  const htmlRows = rows.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${label === "Admin panel" ? `<a href="${escapeHtml(value)}">Открыть заявку</a>` : escapeHtml(value)}</p>`).join("");
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined
  });
  await transporter.sendMail({ from: config.from, replyTo: config.replyTo || undefined, to: recipient, subject, text, html: `<div>${htmlRows}</div>` });
}
