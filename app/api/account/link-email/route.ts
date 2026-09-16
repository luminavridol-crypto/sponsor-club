import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOriginRequest, isInvalidRequestOriginError } from "@/lib/security/request-origin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { readTelegramSession, writeTelegramSession } from "@/lib/telegram/session";
import { getSubscriptionForUser, setUserSubscription, subscriptionHasAccess, tierNumberToName } from "@/lib/data/subscriptions";
import type { Profile } from "@/lib/types";

const schema = z.object({ email: z.string().email().max(320), password: z.string().min(8).max(200) });

export async function POST(request: Request) {
  try {
    await assertSameOriginRequest();
    const session = await readTelegramSession();
    if (!session) return NextResponse.json({ error: "Откройте связывание внутри Telegram Mini App." }, { status: 401 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Проверьте email и пароль." }, { status: 400 });

    const { url, anonKey } = getSupabaseEnv();
    const verifier = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const verified = await verifier.auth.signInWithPassword(parsed.data);
    if (verified.error || !verified.data.user) return NextResponse.json({ error: "Неверный email или пароль." }, { status: 401 });

    const admin = createAdminSupabaseClient();
    const authUserId = verified.data.user.id;
    const { data: identity } = await admin.from("user_identities").select("user_id").eq("provider", "email").eq("provider_subject", authUserId).maybeSingle();
    const websiteProfileId = identity?.user_id ?? authUserId;
    const [{ data: telegramData }, { data: websiteData }] = await Promise.all([
      admin.from("profiles").select("*").eq("id", session.profileId).eq("telegram_id", session.telegramId).maybeSingle(),
      admin.from("profiles").select("*").eq("id", websiteProfileId).maybeSingle()
    ]);
    const telegramProfile = telegramData as Profile | null;
    const websiteProfile = websiteData as Profile | null;
    if (!telegramProfile || !websiteProfile) return NextResponse.json({ error: "Профиль не найден." }, { status: 404 });
    if (websiteProfile.telegram_id && websiteProfile.telegram_id !== session.telegramId) {
      return NextResponse.json({ error: "Этот email уже связан с другим Telegram-аккаунтом." }, { status: 409 });
    }

    if (websiteProfile.id !== telegramProfile.id) {
      const [telegramSubscription, websiteSubscription] = await Promise.all([
        getSubscriptionForUser(telegramProfile.id, telegramProfile, admin),
        getSubscriptionForUser(websiteProfile.id, websiteProfile, admin)
      ]);
      const best = [telegramSubscription, websiteSubscription].filter(Boolean).sort((a, b) => {
        const access = Number(subscriptionHasAccess(b)) - Number(subscriptionHasAccess(a));
        return access || (b?.tier ?? 0) - (a?.tier ?? 0);
      })[0];

      await admin.from("profiles").update({ email: null, access_status: "disabled" }).eq("id", websiteProfile.id);
      await admin.from("user_identities").delete().eq("user_id", telegramProfile.id).eq("provider", "email");
      const identityResult = identity
        ? await admin.from("user_identities").update({ user_id: telegramProfile.id }).eq("provider", "email").eq("provider_subject", authUserId)
        : await admin.from("user_identities").insert({ user_id: telegramProfile.id, provider: "email", provider_subject: authUserId });
      if (identityResult.error) return NextResponse.json({ error: "Не удалось связать идентификаторы." }, { status: 409 });
      const profileResult = await admin.from("profiles").update({
        email: verified.data.user.email ?? parsed.data.email.toLowerCase(),
        auth_source: "web",
        display_name: telegramProfile.display_name || websiteProfile.display_name,
        avatar_url: telegramProfile.avatar_url || websiteProfile.avatar_url
      }).eq("id", telegramProfile.id);
      if (profileResult.error) return NextResponse.json({ error: "Не удалось обновить общий профиль." }, { status: 500 });

      if (best && best.tier > 0) {
        await setUserSubscription({
          userId: telegramProfile.id,
          tier: tierNumberToName(best.tier) ?? "tier_1",
          accessStatus: subscriptionHasAccess(best) ? "active" : "disabled",
          expiresAt: best.expires_at,
          paymentSource: best.payment_source || "account_link",
          client: admin
        });
      }
      await admin.from("subscriptions").update({ tier: 0, status: "cancelled", payment_source: "merged_account" }).eq("user_id", websiteProfile.id);
    }

    await writeTelegramSession(telegramProfile.id, session.telegramId);
    return NextResponse.json({ ok: true, user_id: telegramProfile.id }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (isInvalidRequestOriginError(error)) return NextResponse.json({ error: "Недопустимый источник запроса." }, { status: 403 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось связать аккаунты." }, { status: 500 });
  }
}
