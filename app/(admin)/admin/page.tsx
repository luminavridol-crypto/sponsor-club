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
import { PrivateShell } from "@/components/layout/private-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { getBucketStorageUsage, getOrphanedStorageReport } from "@/lib/data/storage-cleanup";
import { getR2StorageUsage } from "@/lib/r2/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { TIER_LABELS } from "@/lib/utils/tier";

type CleanupItem = {
  id: string;
  title: string;
  meta: string;
  date: string;
  type: string;
  sizeLabel?: string;
  href: string;
  deleteAction: any;
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
  deleteAllAction: any;
  deleteAllConfirmMessage: string;
  items: CleanupItem[];
};

function formatStorageValue(totalBytes: number) {
  const megabytes = totalBytes / 1024 / 1024;
  if (megabytes < 0.1) return "0 MB";
  if (megabytes < 10) return `${megabytes.toFixed(1)} MB`;
  return `${Math.round(megabytes)} MB`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function formatItemSize(bytes?: number | null) {
  if (!bytes) return undefined;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
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

function currentDonationPeriod() {
  const now = new Date();

  return {
    donationYear: now.getUTCFullYear(),
    donationMonth: now.getUTCMonth() + 1
  };
}

function startOfCurrentMonthUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
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

export default async function AdminDashboardPage() {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();
  const monthStart = startOfCurrentMonthUtc();
  const { donationYear, donationMonth } = currentDonationPeriod();

  const [
    { count: monthlyPosts },
    { data: subscriberProfiles },
    { data: purchaseRequests },
    { data: invites },
    { data: users },
    { data: chatMessages },
    { data: oldPosts },
    { data: monthlyDonationRows },
    { data: donationTotals },
    postMediaUsage,
    chatMediaUsage,
    r2MediaUsage,
    orphanReport
  ] = await Promise.all([
    admin
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("publish_at", monthStart),
    admin
      .from("profiles")
      .select("tier, access_status, total_donations, birth_date, display_name, email, id")
      .neq("role", "admin"),
    admin
      .from("purchase_requests")
      .select("id, display_name, email, tier, status, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("invites")
      .select("id, code, email, assigned_tier, created_at, expires_at, used_at, disabled_at")
      .order("created_at", { ascending: false }),
    admin
      .from("profiles")
      .select("id, display_name, email, birth_date, tier, access_status, total_donations")
      .neq("role", "admin"),
    admin
      .from("member_chat_messages")
      .select("id, profile_id, created_at, media_size_bytes")
      .order("created_at", { ascending: false }),
    admin
      .from("posts")
      .select("id, title, slug, post_type, status, created_at, expires_at, thumbnail_size_bytes, post_media(size_bytes)")
      .or(`status.eq.draft,and(expires_at.not.is.null,expires_at.lt.${nowIso})`)
      .order("created_at", { ascending: false }),
    admin
      .from("donation_events")
      .select("amount")
      .eq("donation_year", donationYear)
      .eq("donation_month", donationMonth),
    admin.from("profiles").select("total_donations").neq("role", "admin"),
    getBucketStorageUsage(admin, "post-media"),
    getBucketStorageUsage(admin, "chat-media"),
    getR2StorageUsage().catch(() => ({ fileCount: 0, totalBytes: 0 })),
    getOrphanedStorageReport(admin)
  ]);

  const paidSubscribers = (subscriberProfiles ?? []).filter(
    (item) => item.access_status === "active" && Number(item.total_donations ?? 0) > 0
  );
  const vipCount = paidSubscribers.filter((item) => item.tier === "tier_3").length;
  const closeCount = paidSubscribers.filter((item) => item.tier === "tier_2").length;
  const totalStorageBytes =
    postMediaUsage.totalBytes + chatMediaUsage.totalBytes + r2MediaUsage.totalBytes;
  const pendingRequestsCount = (purchaseRequests ?? []).filter((item) =>
    ["new", "in_progress"].includes(item.status)
  ).length;
  const monthlyDonations = (monthlyDonationRows ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0
  );
  const totalDonations = (donationTotals ?? []).reduce(
    (sum, row) => sum + Number(row.total_donations ?? 0),
    0
  );
  const birthdayPeople = paidSubscribers
    .filter((person) => Boolean(person.birth_date))
    .map((person) => ({
      id: person.id,
      displayName: person.display_name || person.email || "Подписчик",
      birthDate: person.birth_date as string,
      tierLabel: TIER_LABELS[person.tier as keyof typeof TIER_LABELS],
      tierKey: person.tier as "tier_1" | "tier_2" | "tier_3"
    }));

  const usersMap = new Map(
    (users ?? []).map((user) => [user.id, user.display_name || user.email || "Пользователь"] as const)
  );

  const chatGroups = new Map<
    string,
    { count: number; latestAt: string; mediaBytes: number; label: string }
  >();

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
    const totalBytes = Number(post.thumbnail_size_bytes ?? 0) + mediaBytes;

    return {
      id: post.id,
      title: post.title,
      meta: `${post.post_type} • ${post.status}`,
      date: formatDate(post.expires_at || post.created_at),
      type: post.expires_at ? "истёкший контент" : "черновик",
      sizeLabel: formatItemSize(totalBytes),
      href: "/admin/posts",
      deleteAction: deletePostAction,
      deleteConfirmMessage: `Удалить публикацию "${post.title}"?`,
      deleteFields: [{ name: "postId", value: post.id }]
    };
  });

  const oldPostBytes = (oldPosts ?? []).reduce((sum, post) => {
    const mediaBytes = Array.isArray(post.post_media)
      ? post.post_media.reduce((mediaSum, item) => mediaSum + Number(item.size_bytes ?? 0), 0)
      : 0;
    return sum + Number(post.thumbnail_size_bytes ?? 0) + mediaBytes;
  }, 0);

  const cleanupInitialMessage =
    orphanReport.totalCount > 0
      ? `Сейчас найдено ${orphanReport.totalCount} лишних файлов. Можно освободить ${formatStorageValue(
          orphanReport.totalBytes
        )}.`
      : "Сейчас лишних файлов не найдено. Массового удаления без подтверждения нет.";

  const cleanupSections: CleanupSectionData[] = [
    {
      key: "chat",
      title: "Чат",
      count: chatGroups.size,
      sizeLabel: formatStorageValue(
        (chatMessages ?? []).reduce((sum, item) => sum + Number(item.media_size_bytes ?? 0), 0)
      ),
      href: "/admin/chat",
      openLabel: "Открыть",
      deleteAllLabel: "Удалить всё",
      deleteAllAction: deleteAllChatAction,
      deleteAllConfirmMessage: "Удалить все чаты и вложения? Это действие нельзя отменить.",
      items: chatItems
    },
    {
      key: "media",
      title: "Медиа",
      count: orphanReport.totalCount,
      sizeLabel: formatStorageValue(orphanReport.totalBytes),
      href: "/admin/media",
      openLabel: "Открыть",
      deleteAllLabel: "Удалить всё",
      deleteAllAction: deleteAllOrphanMediaAction,
      deleteAllConfirmMessage: "Удалить все неиспользуемые файлы из хранилища?",
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
      deleteAllConfirmMessage: "Удалить все заявки? Это действие нельзя отменить.",
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
      sizeLabel: formatStorageValue(oldPostBytes),
      href: "/admin/posts",
      openLabel: "Открыть",
      deleteAllLabel: "Удалить всё",
      deleteAllAction: deleteOldPostsAction,
      deleteAllConfirmMessage: "Удалить все истёкшие публикации и черновики?",
      items: oldPostItems
    }
  ];

  return (
    <PrivateShell profile={profile} admin>
      <section className="space-y-5">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-glow sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-accentSoft">Admin Control Room</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Управление клубом</h2>
              <p className="mt-3 text-sm leading-6 text-white/62">
                Быстрые действия для заявок, приглашений, пользователей, медиа и ручной очистки.
                Вся нужная аналитика теперь собрана прямо в этом блоке.
              </p>
            </div>

            <div className="w-full xl:max-w-[860px]">
              <CompactAnalyticsRow
                items={[
                  { label: "Подписчики", value: paidSubscribers.length },
                  { label: "VIP", value: vipCount },
                  { label: "Приближённые", value: closeCount },
                  { label: "Хранилище", value: formatStorageValue(totalStorageBytes) },
                  { label: "Ожидают", value: pendingRequestsCount },
                  { label: "Постов месяц", value: monthlyPosts ?? 0 },
                  { label: "Донаты месяц", value: formatMoney(monthlyDonations) },
                  { label: "Донаты всего", value: formatMoney(totalDonations) }
                ]}
              />
            </div>
          </div>
        </div>

        <BirthdayCalendar birthdays={birthdayPeople} />

        <div className="grid gap-4 lg:grid-cols-3">
          <a
            href="/admin/requests"
            className="rounded-[24px] border border-accent/25 bg-accent/10 p-5 transition hover:bg-accent/15"
          >
            <h3 className="text-xl font-semibold text-white">Заявки</h3>
            <p className="mt-2 text-sm leading-6 text-white/68">
              Новые и текущие обращения: {pendingRequestsCount}. Полный список и обработка внутри раздела.
            </p>
          </a>
          <a
            href="/admin/invites"
            className="rounded-[24px] border border-accent/25 bg-accent/10 p-5 transition hover:bg-accent/15"
          >
            <h3 className="text-xl font-semibold text-white">Приглашения пользователей</h3>
            <p className="mt-2 text-sm leading-6 text-white/68">
              Активные, использованные и отключённые приглашения: {(invites ?? []).length}.
            </p>
          </a>
          <a
            href="/admin/users"
            className="rounded-[24px] border border-cyanGlow/25 bg-cyanGlow/10 p-5 transition hover:bg-cyanGlow/15"
          >
            <h3 className="text-xl font-semibold text-white">Пользователи и подписчики</h3>
            <p className="mt-2 text-sm leading-6 text-white/68">
              Всего участников без администратора: {(users ?? []).length}. Управление доступом, заметками и экспортом.
            </p>
          </a>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.28em] text-accentSoft">Storage cleanup</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Чистка файлов</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Проверка показывает результат отдельно. Разделы ручной очистки открываются только по кнопке и не отвлекают по умолчанию.
              </p>
            </div>

            <CleanupCheckForm initialMessage={cleanupInitialMessage} />
          </div>

          <div className="mt-4">
            <CleanupSections sections={cleanupSections} />
          </div>
        </div>
      </section>
    </PrivateShell>
  );
}
