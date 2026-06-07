export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getTelegramProfileFromSession } from "@/lib/telegram/auth";
import { buildLocalPreviewProfile, isLocalTelegramPreviewEnabled } from "@/lib/telegram/local-preview";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function resolveProfileId() {
  const telegramProfile = await getTelegramProfileFromSession();

  if (telegramProfile) {
    return telegramProfile.id;
  }

  if (await isLocalTelegramPreviewEnabled()) {
    return buildLocalPreviewProfile().id;
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function POST() {
  const profileId = await resolveProfileId();

  if (!profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  await admin
    .from("profiles")
    .update({ last_content_seen_at: new Date().toISOString() })
    .eq("id", profileId);

  return new NextResponse(null, { status: 204 });
}
