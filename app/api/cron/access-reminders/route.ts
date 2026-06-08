export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { disableExpiredProfiles } from "@/lib/auth/membership-alerts";
import { deleteExpiredOrDraftPosts } from "@/lib/data/post-cleanup";
import { runAutomaticAccessExpiryReminders } from "@/lib/email/access-reminders";
import { runTelegramAccessReminderSweep } from "@/lib/telegram/access-reminders";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorized();
  }

  const postCleanup = await deleteExpiredOrDraftPosts();
  const expiredAccess = await disableExpiredProfiles();
  const emailResult = await runAutomaticAccessExpiryReminders();
  const telegramResult = await runTelegramAccessReminderSweep();

  return NextResponse.json({
    ok: true,
    postCleanup,
    expiredAccess,
    emailResult,
    telegramResult,
    ranAt: new Date().toISOString()
  });
}
