import Link from "next/link";
import { cleanupStorageAction } from "@/app/actions";
import { StatCard } from "@/components/admin/stat-card";
import { PrivateShell } from "@/components/layout/private-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { cleanupOldChatMessages } from "@/lib/data/chat";
import { cleanupOrphanedStorage, getBucketStorageUsage } from "@/lib/data/storage-cleanup";
import { getR2StorageUsage } from "@/lib/r2/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function formatStorageValue(totalBytes: number) {
  const megabytes = totalBytes / 1024 / 1024;
  if (megabytes < 0.1) return "0 MB";
  if (megabytes < 10) return `${megabytes.toFixed(1)} MB`;
  return `${Math.round(megabytes)} MB`;
}

export default async function AdminDashboardPage() {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();

  await cleanupOldChatMessages(admin);
  const cleanupResult = await cleanupOrphanedStorage(admin);

  const [
    { data: subscriberProfiles },
    { count: purchaseRequestsCount },
    postMediaUsage,
    chatMediaUsage,
    r2MediaUsage
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("tier, access_status, total_donations")
      .neq("role", "admin"),
    admin
      .from("purchase_requests")
      .select("*", { count: "exact", head: true })
      .in("status", ["new", "in_progress"]),
    getBucketStorageUsage(admin, "post-media"),
    getBucketStorageUsage(admin, "chat-media"),
    getR2StorageUsage().catch(() => ({ fileCount: 0, totalBytes: 0 }))
  ]);

  const paidSubscribers = (subscriberProfiles ?? []).filter(
    (item) => item.access_status === "active" && Number(item.total_donations ?? 0) > 0
  );
  const vipCount = paidSubscribers.filter((item) => item.tier === "tier_3").length;
  const closeCount = paidSubscribers.filter((item) => item.tier === "tier_2").length;
  const watcherCount = paidSubscribers.filter((item) => item.tier === "tier_1").length;
  const totalStorageBytes =
    postMediaUsage.totalBytes + chatMediaUsage.totalBytes + r2MediaUsage.totalBytes;
  const totalStorageFiles =
    postMediaUsage.fileCount + chatMediaUsage.fileCount + r2MediaUsage.fileCount;

  return (
    <PrivateShell profile={profile} admin>
      <section className="space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">Admin Control Room</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Управление клубом</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">
            Быстрые действия для заявок, приглашений, пользователей и медиа. Посты и файлы теперь
            уходят в Cloudflare R2, Supabase остаётся для базы и доступа.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Активных подписчиков" value={paidSubscribers.length} tone="accent" />
          <StatCard label="VIP" value={vipCount} tone="cyan" />
          <StatCard label="Приближённый" value={closeCount} />
          <StatCard label="Наблюдатель" value={watcherCount} />
          <StatCard
            label={`Хранилище • ${totalStorageFiles} файлов`}
            value={formatStorageValue(totalStorageBytes)}
            tone="cyan"
          />
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">Storage cleanup</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Чистка файлов</h3>
              <p className="mt-2 text-sm leading-6 text-white/58">
                Сейчас найдено {cleanupResult.postMedia + cleanupResult.chatMedia + cleanupResult.r2Media} лишних
                файлов. Массового удаления без подтверждения нет.
              </p>
            </div>
            <form action={cleanupStorageAction}>
              <button className="rounded-2xl border border-cyanGlow/35 bg-cyanGlow/10 px-5 py-3 text-sm font-medium text-cyanGlow transition hover:bg-cyanGlow/15">
                Проверить вручную
              </button>
            </form>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/admin/requests"
            className="rounded-2xl border border-accent/30 bg-accent/10 p-5 transition hover:bg-accent/20"
          >
            <h3 className="text-xl font-semibold text-white">Заявки</h3>
            <p className="mt-2 text-sm text-white/70">
              Новые обращения по доступу: {purchaseRequestsCount ?? 0}.
            </p>
          </Link>
          <Link
            href="/admin/invites"
            className="rounded-2xl border border-accent/30 bg-accent/10 p-5 transition hover:bg-accent/20"
          >
            <h3 className="text-xl font-semibold text-white">Приглашения</h3>
            <p className="mt-2 text-sm text-white/70">Генерация invite-кодов и приватных ссылок.</p>
          </Link>
          <Link
            href="/admin/users"
            className="rounded-2xl border border-cyanGlow/30 bg-cyanGlow/10 p-5 transition hover:bg-cyanGlow/15"
          >
            <h3 className="text-xl font-semibold text-white">Пользователи</h3>
            <p className="mt-2 text-sm text-white/70">Tier, блокировка и ручное управление доступом.</p>
          </Link>
          <a
            href="/api/admin/export/users"
            className="rounded-2xl border border-cyanGlow/30 bg-cyanGlow/10 p-5 transition hover:bg-cyanGlow/15"
          >
            <h3 className="text-xl font-semibold text-white">Экспорт пользователей</h3>
            <p className="mt-2 text-sm text-white/70">CSV-файл с пользователями и заметками.</p>
          </a>
        </div>
      </section>
    </PrivateShell>
  );
}
