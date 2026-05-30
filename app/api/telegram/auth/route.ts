import { NextResponse } from "next/server";
import { hasClubAccess } from "@/lib/auth/access";
import { upsertTelegramProfile } from "@/lib/telegram/auth";
import { writeTelegramSession } from "@/lib/telegram/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { initData?: string };

    if (!body.initData) {
      return NextResponse.json({ error: "Missing initData" }, { status: 400 });
    }

    const { profile, telegramId } = await upsertTelegramProfile(body.initData);
    await writeTelegramSession(profile.id, telegramId);

    const nextPath =
      profile.role === "admin"
        ? "/tg/admin/posts"
        : hasClubAccess(profile)
          ? "/tg/content"
          : "/tg/support";

    return NextResponse.json(
      {
        ok: true,
        nextPath,
        profile: {
          id: profile.id,
          role: profile.role,
          access_status: profile.access_status,
          telegram_id: profile.telegram_id,
          telegram_username: profile.telegram_username
        }
      },
      {
        headers: {
          "cache-control": "no-store"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Telegram auth failed" },
      {
        status: 401,
        headers: {
          "cache-control": "no-store"
        }
      }
    );
  }
}
