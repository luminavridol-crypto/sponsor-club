import { getTelegramBotUsername, getTelegramMiniAppShortName } from "@/lib/telegram/env";

const FALLBACK_TELEGRAM_BOT_USERNAME = "SponsorClubLumina_bot";

export function buildTelegramMiniAppLink(startParam = "club") {
  const username = getTelegramBotUsername() || FALLBACK_TELEGRAM_BOT_USERNAME;
  const shortName = getTelegramMiniAppShortName();

  if (!username) {
    return null;
  }

  const path = shortName ? `${username}/${shortName}` : username;

  return `https://t.me/${path}?startapp=${encodeURIComponent(startParam)}`;
}

export function buildTelegramInviteLink(code: string) {
  return buildTelegramMiniAppLink(`invite-${code.toUpperCase()}`);
}
