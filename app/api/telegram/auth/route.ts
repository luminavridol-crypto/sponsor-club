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
        ? "/tg/admin"
        : hasClubAccess(profile)
          ? "/tg/content"
          : "/tg/support";

    return NextResponse.json({ ok: true, nextPath });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Telegram auth failed" },
      { status: 401 }
    );
  }
}
