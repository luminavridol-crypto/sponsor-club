import { NextResponse } from "next/server";
import { hasClubAccess } from "@/lib/auth/access";
import { getTelegramProfileFromSession } from "@/lib/telegram/auth";

export async function GET() {
  const profile = await getTelegramProfileFromSession();

  return NextResponse.json(
    {
      ok: Boolean(profile),
      profile: profile
        ? {
            id: profile.id,
            role: profile.role,
            access_status: profile.access_status,
            auth_source: profile.auth_source,
            telegram_id: profile.telegram_id,
            telegram_username: profile.telegram_username,
            telegram_first_name: profile.telegram_first_name,
            telegram_last_name: profile.telegram_last_name
          }
        : null,
      nextPath: profile
        ? profile.role === "admin"
          ? "/tg/admin"
          : hasClubAccess(profile)
            ? "/tg/content"
            : "/tg/support"
        : "/tg"
    },
    {
      headers: {
        "cache-control": "no-store"
      }
    }
  );
}
