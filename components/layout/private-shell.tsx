import { ReactNode } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { PrivateNav } from "@/components/layout/private-nav";
import { SiteSoundNotifier } from "@/components/layout/site-sound-notifier";
import { getAdminUnreadChatProfileIds, hasUnreadMemberChat } from "@/lib/data/chat";
import { getAdminLatestPostCommentAt } from "@/lib/data/comments";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Profile, Tier } from "@/lib/types";
import { canAccessTier } from "@/lib/utils/tier";

export async function PrivateShell({
  profile,
  children,
  admin
}: {
  profile: Profile;
  children: ReactNode;
  admin?: boolean;
}) {
  const adminClient = createAdminSupabaseClient();
  let hasUnreadChat = false;
  let unreadChatCount = 0;
  let initialLatestUnreadChatAt: string | null = null;
  let hasUnreadContent = false;
  let hasPendingRequests = false;
  let pendingRequestsCount = 0;
  let initialLatestPendingRequestAt: string | null = null;
  let initialLatestContentCommentAt: string | null = null;

  if (admin) {
    const unreadProfileIds = await getAdminUnreadChatProfileIds(adminClient);
    hasUnreadChat = unreadProfileIds.length > 0;
    unreadChatCount = unreadProfileIds.length;
    const { count: pendingRequestsResult } = await adminClient
      .from("purchase_requests")
      .select("*", { count: "exact", head: true })
      .in("status", ["new", "in_progress"]);
    pendingRequestsCount = pendingRequestsResult ?? 0;
    hasPendingRequests = pendingRequestsCount > 0;
    const [
      { data: latestUnreadChatRow },
      { data: latestPendingRequestRow },
      latestContentCommentAt
    ] = await Promise.all([
      adminClient
        .from("member_chat_messages")
        .select("created_at")
        .eq("sender_role", "member")
        .is("read_by_admin_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      adminClient
        .from("purchase_requests")
        .select("created_at")
        .in("status", ["new", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getAdminLatestPostCommentAt()
    ]);
    initialLatestUnreadChatAt = latestUnreadChatRow?.created_at ?? null;
    initialLatestPendingRequestAt = latestPendingRequestRow?.created_at ?? null;
    initialLatestContentCommentAt = latestContentCommentAt;
    hasUnreadContent =
      Boolean(latestContentCommentAt) &&
      (!profile.last_content_seen_at ||
        new Date(latestContentCommentAt) > new Date(profile.last_content_seen_at));
  } else {
    hasUnreadChat = await hasUnreadMemberChat(adminClient, profile.id);
    unreadChatCount = hasUnreadChat ? 1 : 0;
    const { data: latestUnreadChatRow } = await adminClient
      .from("member_chat_messages")
      .select("created_at")
      .eq("profile_id", profile.id)
      .eq("sender_role", "admin")
      .is("read_by_member_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    initialLatestUnreadChatAt = latestUnreadChatRow?.created_at ?? null;

    const { data: publishedPosts } = await adminClient
      .from("posts")
      .select("publish_at, required_tier, expires_at")
      .eq("status", "published")
      .lte("publish_at", new Date().toISOString());

    const lastSeenAt = profile.last_content_seen_at ? new Date(profile.last_content_seen_at) : null;

    hasUnreadContent = (publishedPosts ?? []).some((post) => {
      if (post.expires_at && new Date(post.expires_at) <= new Date()) {
        return false;
      }

      if (!canAccessTier(profile.tier, post.required_tier as Tier)) {
        return false;
      }

      if (!lastSeenAt) {
        return true;
      }

      return new Date(post.publish_at) > lastSeenAt;
    });
  }

  return (
    <div className="min-h-screen bg-hero text-white">
      <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
            <Link
              href="/"
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-white/80 transition hover:border-accent/40 hover:text-white sm:px-4 sm:py-3"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5.5 9.5V21h13V9.5" />
                <path d="M9.5 21v-6h5v6" />
              </svg>
              <span>Дом</span>
            </Link>

            <div className="min-w-0">
              <p className="text-sm text-white/50">Приватный клуб Lumina</p>
              <h1 className="break-words text-lg font-semibold text-white sm:text-xl">
                {profile.display_name || "Добро пожаловать обратно"}
              </h1>
            </div>
          </div>
          <form action={signOutAction} className="w-full lg:w-auto">
            <button className="w-full rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-accent/40 hover:text-white lg:w-auto">
              Выйти
            </button>
          </form>
        </div>

        <SiteSoundNotifier
          admin={admin}
          initialUnreadChatCount={unreadChatCount}
          initialPendingRequestsCount={pendingRequestsCount}
          initialLatestUnreadChatAt={initialLatestUnreadChatAt}
          initialLatestPendingRequestAt={initialLatestPendingRequestAt}
          initialLatestContentCommentAt={initialLatestContentCommentAt}
        />

        {admin ? (
          <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
            <PrivateNav
              profile={profile}
              admin
              hasUnreadChat={hasUnreadChat}
              hasUnreadContent={hasUnreadContent}
              hasPendingRequests={hasPendingRequests}
            />
            <div>{children}</div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <PrivateNav
              profile={profile}
              admin={admin}
              hasUnreadChat={hasUnreadChat}
              hasUnreadContent={hasUnreadContent}
              hasPendingRequests={hasPendingRequests}
            />
            <div>{children}</div>
          </div>
        )}
      </div>
    </div>
  );
}
