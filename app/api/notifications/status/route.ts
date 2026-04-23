export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const admin = createAdminSupabaseClient();

  if (profile.role === "admin") {
    const [
      { count: unreadChatCount },
      { count: pendingRequestsCount },
      { data: latestUnreadChat },
      { data: latestPendingRequest }
    ] = await Promise.all([
      admin
        .from("member_chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("sender_role", "member")
        .is("read_by_admin_at", null),
      admin
        .from("purchase_requests")
        .select("*", { count: "exact", head: true })
        .in("status", ["new", "in_progress"]),
      admin
        .from("member_chat_messages")
        .select("created_at")
        .eq("sender_role", "member")
        .is("read_by_admin_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("purchase_requests")
        .select("created_at")
        .in("status", ["new", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    return NextResponse.json(
      {
        role: "admin",
        unreadChatCount: unreadChatCount ?? 0,
        pendingRequestsCount: pendingRequestsCount ?? 0,
        latestUnreadChatAt: latestUnreadChat?.created_at ?? null,
        latestPendingRequestAt: latestPendingRequest?.created_at ?? null
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
        }
      }
    );
  }

  const [{ count: unreadChatCount }, { data: latestUnreadChat }] = await Promise.all([
    admin
      .from("member_chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .eq("sender_role", "admin")
      .is("read_by_member_at", null),
    admin
      .from("member_chat_messages")
      .select("created_at")
      .eq("profile_id", user.id)
      .eq("sender_role", "admin")
      .is("read_by_member_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  return NextResponse.json(
    {
      role: "member",
      unreadChatCount: unreadChatCount ?? 0,
      pendingRequestsCount: 0,
      latestUnreadChatAt: latestUnreadChat?.created_at ?? null,
      latestPendingRequestAt: null
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
      }
    }
  );
}
