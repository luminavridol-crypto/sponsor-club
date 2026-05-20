import { getTelegramBotUsername } from "@/lib/telegram/env";

export function buildTelegramMiniAppLink(startParam = "club") {
  const username = getTelegramBotUsername();

  if (!username) {
    return null;
  }

  return `https://t.me/${username}?startapp=${encodeURIComponent(startParam)}`;
}

export function buildTelegramInviteLink(code: string) {
  return buildTelegramMiniAppLink(`invite-${code.toUpperCase()}`);
}
