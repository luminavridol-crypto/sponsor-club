export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { isLocalTelegramPreviewEnabled, resolveLocalPreviewProfile } from "@/lib/telegram/local-preview";
import { getApprovedPurchasedPostIds } from "@/lib/data/post-purchases";
import { getTelegramProfileFromSession } from "@/lib/telegram/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canAccessTier, getEffectiveTier } from "@/lib/utils/tier";
import { Profile, Tier } from "@/lib/types";
import { hasClubAccess } from "@/lib/auth/access";
import { getMembershipAlert } from "@/lib/auth/membership-alerts";

type NotificationProfile = Pick<
  Profile,
  | "id"
  | "email"
  | "role"
  | "tier"
  | "admin_badges"
  | "access_status"
  | "access_expires_at"
  | "last_content_seen_at"
  | "telegram_id"
>;

function json(data: unknown) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
    }
  });
}

async function resolveProfile(): Promise<NotificationProfile | null> {
  const telegramProfile = await getTelegramProfileFromSession();

  if (telegramProfile) {
    return telegramProfile;
  }

  if (await isLocalTelegramPreviewEnabled()) {
    return resolveLocalPreviewProfile();
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, tier, admin_badges, access_status, access_expires_at, last_content_seen_at, telegram_id")
    .eq("id", user.id)
    .single();

  return (profile as NotificationProfile | null) ?? null;
}

async function getUnreadEligiblePostStatus(profile: NotificationProfile) {
  const admin = createAdminSupabaseClient();
  const lastSeenAt = profile.last_content_seen_at ?? new Date(0).toISOString();
  const nowIso = new Date().toISOString();
  const hasFullClubAccess = profile.role === "admin" || hasClubAccess(profile as Profile);
  const grantedPostIds = hasFullClubAccess ? [] : await getApprovedPurchasedPostIds(profile);

  if (!hasFullClubAccess && !grantedPostIds.length) {
    return {
      unreadPostCount: 0,
      latestPublishedPostAt: null
    };
  }

  const { data: posts } = await admin
    .from("posts")
    .select("id, publish_at, required_tier, expires_at")
    .eq("status", "published")
    .lte("publish_at", nowIso)
    .gt("publish_at", lastSeenAt)
    .order("publish_at", { ascending: false })
    .limit(20);

  const eligiblePosts = (posts ?? []).filter((post) => {
    if (post.expires_at && new Date(post.expires_at) <= new Date()) {
      return false;
    }

    if (hasFullClubAccess) {
      return canAccessTier(getEffectiveTier(profile as Profile), post.required_tier as Tier);
    }

    return grantedPostIds.includes(String(post.id));
  });

  return {
    unreadPostCount: eligiblePosts.length,
    latestPublishedPostAt: eligiblePosts[0]?.publish_at ?? null
  };
}

export async function GET() {
  const profile = await resolveProfile();

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();

  if (profile.role === "admin") {
    const lastContentSeenAt = profile.last_content_seen_at as string | null;
    const contentCommentCountQuery = admin
      .from("post_comments")
      .select("*", { count: "exact", head: true });

    if (lastContentSeenAt) {
      contentCommentCountQuery.gt("created_at", lastContentSeenAt);
    }

    const [
      { count: unreadChatCount },
      { count: pendingRequestsCount },
      { count: unreadContentCommentCount },
      { data: latestUnreadChat },
      { data: latestPendingRequest },
      { data: latestContentComment }
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
      contentCommentCountQuery,
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
        .maybeSingle(),
      admin
        .from("post_comments")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    return json({
      role: "admin",
      unreadChatCount: unreadChatCount ?? 0,
      pendingRequestsCount: pendingRequestsCount ?? 0,
      unreadContentCommentCount: unreadContentCommentCount ?? 0,
      latestUnreadChatAt: latestUnreadChat?.created_at ?? null,
      latestPendingRequestAt: latestPendingRequest?.created_at ?? null,
      latestContentCommentAt: latestContentComment?.created_at ?? null,
      unreadPostCount: 0,
      latestPublishedPostAt: null,
      membershipAlert: null
    });
  }

  const [chatStatus, postStatus] = await Promise.all([
    Promise.all([
      admin
        .from("member_chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profile.id)
        .eq("sender_role", "admin")
        .is("read_by_member_at", null),
      admin
        .from("member_chat_messages")
        .select("created_at")
        .eq("profile_id", profile.id)
        .eq("sender_role", "admin")
        .is("read_by_member_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ]),
    getUnreadEligiblePostStatus(profile)
  ]);

  const [{ count: unreadChatCount }, { data: latestUnreadChat }] = chatStatus;
  const membershipAlert = getMembershipAlert(profile as Profile);

  return json({
    role: "member",
    unreadChatCount: unreadChatCount ?? 0,
    pendingRequestsCount: 0,
    unreadContentCommentCount: 0,
    latestUnreadChatAt: latestUnreadChat?.created_at ?? null,
    latestPendingRequestAt: null,
    latestContentCommentAt: null,
    unreadPostCount: postStatus.unreadPostCount,
    latestPublishedPostAt: postStatus.latestPublishedPostAt,
    membershipAlert
  });
}
