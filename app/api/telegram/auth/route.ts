import { NextResponse } from "next/server";
import { assertSameOriginRequest, isInvalidRequestOriginError } from "@/lib/security/request-origin";
import { upsertTelegramProfile } from "@/lib/telegram/auth";
import { writeTelegramSession } from "@/lib/telegram/session";

export async function POST(request: Request) {
  try {
    await assertSameOriginRequest();
    const body = (await request.json()) as { initData?: string };

    if (!body.initData) {
      return NextResponse.json({ error: "Missing initData" }, { status: 400 });
    }

    const { profile, telegramId, requestedPath } = await upsertTelegramProfile(body.initData);
    await writeTelegramSession(profile.id, telegramId);

    const nextPath =
      requestedPath ??
      (profile.role === "admin"
        ? "/tg/admin/posts"
        : "/tg/content");

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
    if (isInvalidRequestOriginError(error)) {
      return NextResponse.json({ error: "Недопустимый источник запроса." }, { status: 403 });
    }

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
