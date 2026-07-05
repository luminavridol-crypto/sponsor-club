import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireActiveAdminSession } from "@/lib/auth/admin-session";
import { getChatMessageGrantExpiry } from "@/lib/data/chat-limits";
import { assertSameOriginRequest, isInvalidRequestOriginError } from "@/lib/security/request-origin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function formValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function redirectBack(request: Request) {
  const referer = request.headers.get("referer");
  return NextResponse.redirect(referer || "/tg/admin/users");
}

export async function POST(request: Request) {
  try {
    await assertSameOriginRequest();
    const adminProfile = await requireActiveAdminSession();

    if (!adminProfile) {
      return NextResponse.json({ error: "Нужно войти в аккаунт." }, { status: 401 });
    }

    const formData = await request.formData();
    const actionType = formValue(formData.get("actionType"));
    const requestId = formValue(formData.get("requestId"));

    if (!requestId) {
      return redirectBack(request);
    }

    const admin = createAdminSupabaseClient();

    if (actionType === "delete") {
      await admin.from("purchase_requests").delete().eq("id", requestId);
      return redirectBack(request);
    }

    const status = formValue(formData.get("status"));
    const accessMode = formValue(formData.get("accessMode"));

    if (!["new", "in_progress", "completed"].includes(status)) {
      return redirectBack(request);
    }

    const allowClubAccess = accessMode === "club";
    const allowPostAccess = accessMode === "post";
    const allowChatMessages = accessMode === "chat_messages";

    if (allowClubAccess) {
      const { data: purchaseRequest } = await admin
        .from("purchase_requests")
        .select("id, tier, email, display_name, country, contact")
        .eq("id", requestId)
        .maybeSingle();

      if (purchaseRequest?.email) {
        const { data: existingProfile } = await admin
          .from("profiles")
          .select("id, role")
          .eq("email", purchaseRequest.email)
          .maybeSingle();

        if (existingProfile && existingProfile.role !== "admin") {
          await admin
            .from("profiles")
            .update({
              tier: purchaseRequest.tier,
              access_status: "active"
            })
            .eq("id", existingProfile.id);
        } else {
          const defaultExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          const note = `Заявка: ${purchaseRequest.display_name || "без имени"} • ${purchaseRequest.country} • ${purchaseRequest.contact}`;
          const { data: activeInvite } = await admin
            .from("invites")
            .select("id")
            .eq("email", purchaseRequest.email)
            .is("used_at", null)
            .is("disabled_at", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (activeInvite) {
            await admin
              .from("invites")
              .update({
                assigned_tier: purchaseRequest.tier,
                note,
                expires_at: defaultExpiresAt
              })
              .eq("id", activeInvite.id);
          } else {
            await admin.from("invites").insert({
              code: `VIP-${randomUUID().slice(0, 8).toUpperCase()}`,
              email: purchaseRequest.email,
              assigned_tier: purchaseRequest.tier,
              expires_at: defaultExpiresAt,
              note,
              created_by: adminProfile.id
            });
          }
        }
      }
    }

    if (allowPostAccess) {
      const { data: purchaseRequest } = await admin
        .from("purchase_requests")
        .select("id, requested_post_id")
        .eq("id", requestId)
        .maybeSingle();

      if (!purchaseRequest?.requested_post_id) {
        return redirectBack(request);
      }
    }

    if (allowChatMessages) {
      const { data: purchaseRequest } = await admin
        .from("purchase_requests")
        .select("id, email, chat_messages_count")
        .eq("id", requestId)
        .maybeSingle();

      if (!purchaseRequest?.email || !purchaseRequest.chat_messages_count) {
        return redirectBack(request);
      }

      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id, role")
        .eq("email", purchaseRequest.email)
        .maybeSingle();

      if (!existingProfile || existingProfile.role === "admin") {
        return redirectBack(request);
      }

      await admin.from("member_chat_message_grants").insert({
        profile_id: existingProfile.id,
        purchase_request_id: purchaseRequest.id,
        message_count: purchaseRequest.chat_messages_count,
        expires_at: getChatMessageGrantExpiry(),
        approved_by: adminProfile.id
      });
    }

    await admin
      .from("purchase_requests")
      .update({
        status,
        approved_for_club: allowClubAccess,
        approved_for_post: allowPostAccess,
        approved_for_chat_messages: allowChatMessages
      })
      .eq("id", requestId);

    return redirectBack(request);
  } catch (error) {
    if (isInvalidRequestOriginError(error)) {
      return NextResponse.json({ error: "Недопустимый источник запроса." }, { status: 403 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка обработки заявки." },
      { status: 500 }
    );
  }
}
