export const dynamic = "force-dynamic";

import {
  deleteAllChatAction,
  deleteAllInvitesAction,
  deleteAllOrphanMediaAction,
  deleteAllPurchaseRequestsAction,
  deleteInviteAction,
  deleteOldPostsAction,
  deleteOrphanMediaAction,
  deletePostAction,
  deletePurchaseRequestAction,
  deleteUserChatAction
} from "@/app/actions";
import { BirthdayCalendar } from "@/components/admin/birthday-calendar";
import { CleanupCheckForm } from "@/components/admin/cleanup-check-form";
import { CleanupSections } from "@/components/admin/cleanup-sections";
import { UserCard } from "@/components/admin/user-card";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { getSignedAvatarUrls } from "@/lib/data/profiles";
import { getOrphanedStorageReport } from "@/lib/data/storage-cleanup";
import { getR2StorageUsage } from "@/lib/r2/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { DonationEvent, Profile } from "@/lib/types";
import { TIER_LABELS } from "@/lib/utils/tier";

type AdminFormAction = (formData: FormData) => void | Promise<void>;

type CleanupItem = {
  id: string;
  title: string;
  meta: string;
  date: string;
  type: string;
  sizeLabel?: string;
  href: string;
  deleteAction: AdminFormAction;
  deleteConfirmMessage: string;
  deleteFields: { name: string; value: string }[];
};

type CleanupSectionData = {
  key: string;
  title: string;
  count: number;
  sizeLabel?: string;
  href: string;
  openLabel: string;
  deleteAllLabel: string;
  deleteAllAction: AdminFormAction;
  deleteAllConfirmMessage: string;
  items: CleanupItem[];
};

function getTierSortWeight(user: Profile) {
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

function formatDate(value: string | null | undefined) {
  if (!value) return "Дата не указана";
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatStorageValue(totalBytes: number) {
  const megabytes = totalBytes / 1024 / 1024;
  if (megabytes < 0.1) return "0 MB";
  if (megabytes < 10) return `${megabytes.toFixed(1)} MB`;
  return `${Math.round(megabytes)} MB`;
}

function formatItemSize(bytes?: number | null) {
  if (!bytes) return undefined;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function CompactAnalyticsRow({
  items
}: {
  items: { label: string; value: string | number }[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">{item.label}</p>
          <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export default async function TelegramAdminUsersPage() {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();

  const [
    { data: profilesData },
    { data: donationEventsData },
    { data: purchaseRequests },
    { data: invites },
    { data: chatMessages },
    { data: oldPosts },
    orphanReport,
    r2MediaUsage
  ] = await Promise.all([
    admin.from("profiles").select("*"),
    admin.from("donation_events").select("*").order("created_at", { ascending: false }),
    admin.from("purchase_requests").select("id, display_name, email, tier, status, created_at").order("created_at", { ascending: false }),
    admin
      .from("invites")
      .select("id, code, email, assigned_tier, created_at, expires_at, used_at, disabled_at")
      .order("created_at", { ascending: false }),
    admin.from("member_chat_messages").select("id, profile_id, created_at, media_size_bytes").order("created_at", { ascending: false }),
    admin
      .from("posts")
      .select("id, title, slug, post_type, status, created_at, expires_at, thumbnail_size_bytes, post_media(size_bytes)")
      .or(`status.eq.draft,and(expires_at.not.is.null,expires_at.lt.${nowIso})`)
      .order("created_at", { ascending: false }),
    getOrphanedStorageReport(admin),
    getR2StorageUsage().catch(() => ({ fileCount: 0, totalBytes: 0 }))
  ]);

  const users = sortUsers(((profilesData ?? []) as Profile[]).filter((user) => user.role !== "admin"));
  const avatarMap = await getSignedAvatarUrls(
    users.map((user) => user.avatar_url).filter((path): path is string => Boolean(path))
  );
  const usersWithAvatars = users.map((user) => ({
    ...user,
    avatar_url: user.avatar_url ? avatarMap[user.avatar_url] ?? user.avatar_url : null
  }));
  const donationEvents = (donationEventsData ?? []) as DonationEvent[];
  const donationMap = new Map<string, DonationEvent[]>();

  donationEvents.forEach((event) => {
    const existing = donationMap.get(event.profile_id) ?? [];
    existing.push(event);
    donationMap.set(event.profile_id, existing);
  });

  const activeUsers = users.filter((user) => user.access_status === "active");
  const vipCount = activeUsers.filter((user) => user.tier === "tier_3").length;
  const closeCount = activeUsers.filter((user) => user.tier === "tier_2").length;
  const watcherCount = activeUsers.filter((user) => user.tier === "tier_1").length;
  const pendingRequestsCount = (purchaseRequests ?? []).filter((item) =>
    ["new", "in_progress"].includes(item.status)
  ).length;

  const birthdayPeople = activeUsers
    .filter((person) => Boolean(person.birth_date))
    .map((person) => ({
      id: person.id,
      displayName: person.display_name || person.email || "Участник",
      birthDate: person.birth_date as string,
      tierLabel: TIER_LABELS[person.tier],
      tierKey: person.tier
    }));

  const usersMap = new Map(
    users.map((user) => [user.id, user.display_name || user.email || "Пользователь"] as const)
  );
  const chatGroups = new Map<string, { count: number; latestAt: string; mediaBytes: number; label: string }>();

  for (const message of chatMessages ?? []) {
    const existing = chatGroups.get(message.profile_id) ?? {
      count: 0,
      latestAt: message.created_at,
      mediaBytes: 0,
      label: usersMap.get(message.profile_id) ?? "Пользователь"
    };

    existing.count += 1;
    existing.mediaBytes += Number(message.media_size_bytes ?? 0);
    if (new Date(message.created_at) > new Date(existing.latestAt)) {
      existing.latestAt = message.created_at;
    }
    chatGroups.set(message.profile_id, existing);
  }

  const chatItems: CleanupItem[] = [...chatGroups.entries()]
    .sort((a, b) => new Date(b[1].latestAt).getTime() - new Date(a[1].latestAt).getTime())
    .slice(0, 8)
    .map(([profileId, item]) => ({
      id: profileId,
      title: item.label,
      meta: `${item.count} сообщений`,
      date: formatDate(item.latestAt),
      type: "чат",
      sizeLabel: formatItemSize(item.mediaBytes),
      href: `/admin/chat?user=${profileId}`,
      deleteAction: deleteUserChatAction,
      deleteConfirmMessage: `Очистить весь чат с ${item.label}?`,
      deleteFields: [{ name: "profileId", value: profileId }]
    }));

  const mediaItems: CleanupItem[] = [
    ...orphanReport.postMedia.map((item, index) => ({
      id: `post-${index}-${item.path}`,
      title: item.path.split("/").pop() || item.path,
      meta: "Не привязано к постам",
      date: "Supabase post-media",
      type: "медиа",
      sizeLabel: formatItemSize(item.sizeBytes),
      href: "/admin/media",
      deleteAction: deleteOrphanMediaAction,
      deleteConfirmMessage: "Удалить этот неиспользуемый файл?",
      deleteFields: [
        { name: "provider", value: "supabase" },
        { name: "bucket", value: "post-media" },
        { name: "objectKey", value: item.path },
        { name: "path", value: item.path }
      ]
    })),
    ...orphanReport.chatMedia.map((item, index) => ({
      id: `chat-${index}-${item.path}`,
      title: item.path.split("/").pop() || item.path,
      meta: "Не привязано к чату",
      date: "Supabase chat-media",
      type: "медиа",
      sizeLabel: formatItemSize(item.sizeBytes),
      href: "/admin/media",
      deleteAction: deleteOrphanMediaAction,
      deleteConfirmMessage: "Удалить этот неиспользуемый файл?",
      deleteFields: [
        { name: "provider", value: "supabase" },
        { name: "bucket", value: "chat-media" },
        { name: "objectKey", value: item.path },
        { name: "path", value: item.path }
      ]
    })),
    ...orphanReport.r2Media.map((item, index) => ({
      id: `r2-${index}-${item.path}`,
      title: item.path.replace(/^r2:/, "").split("/").pop() || item.path,
      meta: "Не привязано к базе",
      date: "Cloudflare R2",
      type: "медиа",
      sizeLabel: formatItemSize(item.sizeBytes),
      href: "/admin/media",
      deleteAction: deleteOrphanMediaAction,
      deleteConfirmMessage: "Удалить этот неиспользуемый файл из R2?",
      deleteFields: [
        { name: "provider", value: "r2" },
        { name: "bucket", value: process.env.R2_BUCKET_NAME ?? "" },
        { name: "objectKey", value: item.path.replace(/^r2:/, "") },
        { name: "path", value: item.path }
      ]
    }))
  ].slice(0, 8);

  const requestItems: CleanupItem[] = (purchaseRequests ?? []).slice(0, 8).map((request) => ({
    id: request.id,
    title: request.display_name || request.email,
    meta: `${request.tier} • ${request.email}`,
    date: formatDate(request.created_at),
    type: request.status,
    href: "/admin/requests",
    deleteAction: deletePurchaseRequestAction,
    deleteConfirmMessage: "Удалить эту заявку?",
    deleteFields: [{ name: "requestId", value: request.id }]
  }));

  const inviteItems: CleanupItem[] = (invites ?? []).slice(0, 8).map((invite) => ({
    id: invite.id,
    title: invite.code,
    meta: invite.email || "Без привязки к email",
    date: formatDate(invite.created_at),
    type: invite.used_at ? "использовано" : invite.disabled_at ? "отключено" : "активно",
    href: "/admin/invites",
    deleteAction: deleteInviteAction,
    deleteConfirmMessage: "Удалить это приглашение?",
    deleteFields: [{ name: "inviteId", value: invite.id }]
  }));

  const oldPostItems: CleanupItem[] = (oldPosts ?? []).slice(0, 8).map((post) => {
    const mediaBytes = Array.isArray(post.post_media)
      ? post.post_media.reduce((sum, item) => sum + Number(item.size_bytes ?? 0), 0)
      : 0;

    return {
      id: post.id,
      title: post.title,
      meta: `${post.post_type} • ${post.status}`,
      date: formatDate(post.expires_at || post.created_at),
      type: post.expires_at ? "истёкший контент" : "черновик",
      sizeLabel: formatItemSize(Number(post.thumbnail_size_bytes ?? 0) + mediaBytes),
      href: "/admin/posts",
      deleteAction: deletePostAction,
      deleteConfirmMessage: `Удалить публикацию "${post.title}"?`,
      deleteFields: [{ name: "postId", value: post.id }]
    };
  });

  const cleanupSections: CleanupSectionData[] = [
    {
      key: "chat",
      title: "Чат",
      count: chatGroups.size,
      sizeLabel: formatStorageValue((chatMessages ?? []).reduce((sum, item) => sum + Number(item.media_size_bytes ?? 0), 0)),
      href: "/admin/chat",
      openLabel: "Открыть",
      deleteAllLabel: "Удалить всё",
      deleteAllAction: deleteAllChatAction,
      deleteAllConfirmMessage: "Удалить все чаты и вложения?",
      items: chatItems
    },
    {
      key: "media",
      title: "Медиа",
      count: orphanReport.totalCount,
      sizeLabel: formatStorageValue(orphanReport.totalBytes + r2MediaUsage.totalBytes * 0),
      href: "/admin/media",
      openLabel: "Открыть",
      deleteAllLabel: "Удалить всё",
      deleteAllAction: deleteAllOrphanMediaAction,
      deleteAllConfirmMessage: "Удалить все неиспользуемые файлы?",
      items: mediaItems
    },
    {
      key: "requests",
      title: "Заявки",
      count: (purchaseRequests ?? []).length,
      href: "/admin/requests",
      openLabel: "Открыть",
      deleteAllLabel: "Удалить всё",
      deleteAllAction: deleteAllPurchaseRequestsAction,
      deleteAllConfirmMessage: "Удалить все заявки?",
      items: requestItems
    },
    {
      key: "invites",
      title: "Приглашения",
      count: (invites ?? []).length,
      href: "/admin/invites",
      openLabel: "Открыть",
      deleteAllLabel: "Удалить всё",
      deleteAllAction: deleteAllInvitesAction,
      deleteAllConfirmMessage: "Удалить все приглашения?",
      items: inviteItems
    },
    {
      key: "old-posts",
      title: "Старый контент",
      count: (oldPosts ?? []).length,
      href: "/admin/posts",
      openLabel: "Открыть",
      deleteAllLabel: "Удалить всё",
      deleteAllAction: deleteOldPostsAction,
      deleteAllConfirmMessage: "Удалить все истёкшие публикации и черновики?",
      items: oldPostItems
    }
  ];

  const cleanupInitialMessage =
    orphanReport.totalCount > 0
      ? `Сейчас найдено ${orphanReport.totalCount} лишних файлов. Можно освободить ${formatStorageValue(orphanReport.totalBytes)}.`
      : "Сейчас лишних файлов не найдено.";

  return (
    <MiniAppShell profile={profile} title="Пользователи">
      <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-glow">
        <CompactAnalyticsRow
          items={[
            { label: "Участники", value: activeUsers.length },
            { label: "VIP", value: vipCount },
            { label: "Приближённые", value: closeCount },
            { label: "Наблюдатели", value: watcherCount },
            { label: "Ожидают", value: pendingRequestsCount },
            { label: "Профилей", value: users.length }
          ]}
        />
      </section>

      <BirthdayCalendar birthdays={birthdayPeople} />

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-glow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-accentSoft">Чистка</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Файлы, заявки и хвосты</h2>
          </div>
          <CleanupCheckForm initialMessage={cleanupInitialMessage} />
        </div>
        <div className="mt-4">
          <CleanupSections sections={cleanupSections} />
        </div>
      </section>

      {usersWithAvatars.map((user) => (
        <UserCard
          key={`${user.id}-${user.tier}-${user.access_expires_at ?? "none"}-${(user.admin_badges ?? []).join(",")}`}
          user={user}
          isCurrentAdmin={user.id === profile.id}
          donationEvents={donationMap.get(user.id) ?? []}
          hideUnlimitedButton
        />
      ))}
    </MiniAppShell>
  );
}
