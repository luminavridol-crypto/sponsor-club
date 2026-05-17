import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getTelegramSessionSecret } from "@/lib/telegram/env";

export const TELEGRAM_SESSION_COOKIE = "tg_club_session";

type TelegramSessionPayload = {
  profileId: string;
  telegramId: string;
  issuedAt: number;
};

function sign(value: string) {
  return createHmac("sha256", getTelegramSessionSecret()).update(value).digest("base64url");
}

function encode(payload: TelegramSessionPayload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(body);
  return `${body}.${signature}`;
}

function decode(value: string): TelegramSessionPayload | null {
  const [body, signature] = value.split(".");

  if (!body || !signature) {
    return null;
  }

  const expected = sign(body);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TelegramSessionPayload;

    if (!parsed.profileId || !parsed.telegramId || !parsed.issuedAt) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function readTelegramSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(TELEGRAM_SESSION_COOKIE)?.value;
  return raw ? decode(raw) : null;
}

export async function writeTelegramSession(profileId: string, telegramId: string) {
  const cookieStore = await cookies();
  cookieStore.set(TELEGRAM_SESSION_COOKIE, encode({ profileId, telegramId, issuedAt: Date.now() }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearTelegramSession() {
  const cookieStore = await cookies();
  cookieStore.set(TELEGRAM_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
