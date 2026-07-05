export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { AdminUsersBrowser } from "@/components/admin/admin-users-browser";
import {
  AdminUsersCleanupPanel,
  AdminUsersCleanupPanelFallback
} from "@/components/admin/admin-users-cleanup-panel";
import {
  ADMIN_EYEBROW_CLASS,
  ADMIN_HEADER_CLASS,
  ADMIN_PANEL_CLASS,
  ADMIN_PANEL_GLOW_CLASS,
  ADMIN_SHELL_CLASS
} from "@/components/admin/theme";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { hasClubAccess } from "@/lib/auth/access";
import { requireAdmin } from "@/lib/auth/guards";
import { getSignedChatMediaUrls } from "@/lib/data/chat";
import { getSignedAvatarUrls } from "@/lib/data/profiles";
import { listR2Media } from "@/lib/storage/media";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { LOCAL_PREVIEW_MEMBER_ID } from "@/lib/telegram/local-preview";
import { DonationEvent, Profile, PurchaseRequest } from "@/lib/types";
import { canAccessTier, normalizeProfileTier } from "@/lib/utils/tier";

function resolveRequestProfileId(request: PurchaseRequest, profileByEmail: Map<string, Profile>) {
  const matchingProfile = profileByEmail.get(request.email);

  if (matchingProfile) {
    return matchingProfile.id;
  }

  if (request.email === "preview@localhost") {
    return LOCAL_PREVIEW_MEMBER_ID;
  }

  return null;
}

function getTierSortWeight(user: Profile) {
  if (user.tier === "tier_4") return 4;
  if (user.tier === "tier_3") return 3;
  if (user.tier === "tier_2") return 2;
  return 1;
}

function sortUsers(users: Profile[]) {
  return [...users].sort((a, b) => {
    const tierDiff = getTierSortWeight(b) - getTierSortWeight(a);
    if (tierDiff !== 0) return tierDiff;

    const donationDiff = Number(b.total_donations || 0) - Number(a.total_donations || 0);
    if (donationDiff !== 0) return donationDiff;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export default async function TelegramAdminUsersPage() {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();

  const [{ data: profilesData }, { data: donationEventsData }, { data: purchaseRequestsData }] =
    await Promise.all([
      admin.from("profiles").select("*"),
      admin.from("donation_events").select("*").order("created_at", { ascending: false }),
      admin
        .from("purchase_requests")
        .select("id, tier, request_kind, display_name, email, country, contact, status, approved_for_club, approved_for_post, approved_for_chat_messages, chat_messages_count, requested_post_id, requested_post_slug, requested_post_title, requested_post_price, created_at, updated_at")
        .in("status", ["new", "in_progress"])
        .order("created_at", { ascending: false })
    ]);

  const users = sortUsers(
    ((profilesData ?? []) as Profile[])
      .map((user) => normalizeProfileTier(user))
      .filter((user) => user.role !== "admin")
  );
  const avatarMap = await getSignedAvatarUrls(
    users.map((user) => user.avatar_url).filter((path): path is string => Boolean(path))
  );
  const usersWithAvatars = users.map((user) => ({
    ...user,
    avatar_url: user.avatar_url ? avatarMap[user.avatar_url] ?? user.avatar_url : null
  }));

  const donationEvents = (donationEventsData ?? []) as DonationEvent[];
  const purchaseRequests = (purchaseRequestsData ?? []) as PurchaseRequest[];
  const requestedPostIds = [...new Set(purchaseRequests.map((request) => request.requested_post_id).filter(Boolean))];
  const { data: requestedPostsData } = requestedPostIds.length
    ? await admin.from("posts").select("id, required_tier").in("id", requestedPostIds)
    : { data: [] as Array<{ id: string; required_tier: Profile["tier"] }> };
  const requestedPostTierMap = new Map(
    ((requestedPostsData ?? []) as Array<{ id: string; required_tier: Profile["tier"] }>).map((post) => [
      post.id,
      post.required_tier
    ])
  );
  const profileByEmail = new Map(users.map((user) => [user.email, user] as const));
  const requestProfileIds = [
    ...new Set(purchaseRequests.map((request) => resolveRequestProfileId(request, profileByEmail)).filter((value): value is string => Boolean(value)))
  ];
  const { data: requestMessagesData } = requestProfileIds.length
    ? await admin
        .from("member_chat_messages")
        .select("profile_id, body, media_path, media_type, created_at")
        .in("profile_id", requestProfileIds)
        .eq("sender_role", "member")
        .order("created_at", { ascending: false })
    : { data: [] as Array<{ profile_id: string; body: string | null; media_path: string | null; media_type: PurchaseRequest["latest_request_media_type"]; created_at: string }> };
  const latestRequestMessageByProfileId = new Map<
    string,
    {
      body: string | null;
      media_path: string | null;
      media_type: PurchaseRequest["latest_request_media_type"];
      created_at: string;
    }
  >();

  for (const message of (requestMessagesData ?? []) as Array<{
    profile_id: string;
    body: string | null;
    media_path: string | null;
    media_type: PurchaseRequest["latest_request_media_type"];
    created_at: string;
  }>) {
    if (!latestRequestMessageByProfileId.has(message.profile_id)) {
      latestRequestMessageByProfileId.set(message.profile_id, message);
    }
  }

  const previewFallbackMedia =
    purchaseRequests.some((request) => request.email === "preview@localhost") &&
    !latestRequestMessageByProfileId.has(LOCAL_PREVIEW_MEMBER_ID)
      ? (await listR2Media("chat/local-preview-member/").catch(() => []))
          .sort((left, right) => {
            const leftTime = left.lastModified ? new Date(left.lastModified).getTime() : 0;
            const rightTime = right.lastModified ? new Date(right.lastModified).getTime() : 0;
            return rightTime - leftTime;
          })[0] ?? null
      : null;

  const mediaMap = await getSignedChatMediaUrls(
    [
      ...[...latestRequestMessageByProfileId.values()]
        .map((message) => message.media_path)
        .filter((value): value is string => Boolean(value)),
      ...(previewFallbackMedia?.storagePath ? [previewFallbackMedia.storagePath] : [])
    ]
  );

  const purchaseRequestsWithAccessHints = purchaseRequests.map((request) => {
    const matchingProfile = profileByEmail.get(request.email);
    const requesterProfileId = resolveRequestProfileId(request, profileByEmail);
    const requestedPostRequiredTier = request.requested_post_id
      ? requestedPostTierMap.get(request.requested_post_id) ?? null
      : null;
    const latestMessage = requesterProfileId ? latestRequestMessageByProfileId.get(requesterProfileId) : null;
    const fallbackPreviewMediaPath =
      !latestMessage && request.email === "preview@localhost" ? previewFallbackMedia?.storagePath ?? null : null;
    const alreadyHasPostAccess = Boolean(
      matchingProfile &&
        requestedPostRequiredTier &&
        hasClubAccess(matchingProfile) &&
        canAccessTier(matchingProfile.tier, requestedPostRequiredTier)
    );

    return {
      ...request,
      requested_post_required_tier: requestedPostRequiredTier,
      already_has_post_access: alreadyHasPostAccess,
      requester_profile_id: requesterProfileId,
      latest_request_message_at: latestMessage?.created_at ?? null,
      latest_request_body: latestMessage?.body ?? null,
      latest_request_media_url: latestMessage?.media_path
        ? mediaMap[latestMessage.media_path] ?? null
        : fallbackPreviewMediaPath
          ? mediaMap[fallbackPreviewMediaPath] ?? null
          : null,
      latest_request_media_type: latestMessage?.media_type ?? (fallbackPreviewMediaPath ? "image" : null)
    };
  });
  const donationMap = new Map<string, DonationEvent[]>();

  donationEvents.forEach((event) => {
    const existing = donationMap.get(event.profile_id) ?? [];
    existing.push(event);
    donationMap.set(event.profile_id, existing);
  });

  return (
    <MiniAppShell
      profile={profile}
      title="Люди"
      shellClassName={ADMIN_SHELL_CLASS}
      headerClassName={ADMIN_HEADER_CLASS}
      eyebrowClassName={ADMIN_EYEBROW_CLASS}
    >
      <section className={ADMIN_PANEL_CLASS}>
        <div className={ADMIN_PANEL_GLOW_CLASS} />
        <div className="relative mt-4">
          <AdminUsersBrowser
            users={usersWithAvatars.map((user) => ({
              ...user,
              donationEvents: donationMap.get(user.id) ?? []
            }))}
            currentAdminId={profile.id}
            requests={purchaseRequestsWithAccessHints}
          />
        </div>
      </section>

      <Suspense fallback={<AdminUsersCleanupPanelFallback />}>
        <AdminUsersCleanupPanel />
      </Suspense>
    </MiniAppShell>
  );
}
