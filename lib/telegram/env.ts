export function getTelegramBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN.");
  }

  return token;
}

export function getTelegramSessionSecret() {
  return process.env.TG_SESSION_SECRET?.trim() || getTelegramBotToken();
}

export function getTelegramInitDataMaxAgeSeconds() {
  const raw = process.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS?.trim();
  const parsed = raw ? Number(raw) : 86400;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 86400;
}

export function getSupportDetails() {
  return {
    cardLabel: process.env.NEXT_PUBLIC_SUPPORT_CARD_LABEL?.trim() || "Карта",
    cardNumber: process.env.NEXT_PUBLIC_SUPPORT_CARD_NUMBER?.trim() || "",
    note:
      process.env.NEXT_PUBLIC_SUPPORT_DONATION_NOTE?.trim() ||
      "После перевода нажми кнопку ниже и отправь заявку. Я подтвержу донат вручную."
  };
}
