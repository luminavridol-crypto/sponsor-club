export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { PrivateShell } from "@/components/layout/private-shell";
import { requireProfile } from "@/lib/auth/guards";
import { getBucketStorageUsage } from "@/lib/data/storage-cleanup";
import { getR2StorageUsage } from "@/lib/r2/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function formatStorage(totalBytes: number) {
  const megabytes = totalBytes / 1024 / 1024;
  if (megabytes < 0.1) return "0 MB";
  if (megabytes < 10) return `${megabytes.toFixed(1)} MB`;
  return `${Math.round(megabytes)} MB`;
}

function startOfCurrentMonthUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function currentDonationPeriod() {
  const now = new Date();

  return {
    donationYear: now.getUTCFullYear(),
    donationMonth: now.getUTCMonth() + 1
  };
}

function StatCard({
  label,
  value,
  accent = "neutral"
}: {
  label: string;
  value: string | number;
  accent?: "neutral" | "accent" | "cyan";
}) {
  const accentClass =
    accent === "accent"
      ? "border-accent/30 bg-accent/10"
      : accent === "cyan"
        ? "border-cyanGlow/30 bg-cyanGlow/10"
        : "border-white/10 bg-white/5";

  const labelClass =
    accent === "accent"
      ? "text-accentSoft"
      : accent === "cyan"
        ? "text-cyanGlow"
        : "text-white/55";

  return (
    <div className={`rounded-2xl border p-5 ${accentClass}`}>
      <p className={`text-sm ${labelClass}`}>{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const profile = await requireProfile();

  if (profile.role !== "admin") {
    redirect("/profile");
  }

  const admin = createAdminSupabaseClient();
  const monthStart = startOfCurrentMonthUtc();
  const { donationYear, donationMonth } = currentDonationPeriod();

  const [
    { count: monthlyPosts },
    { data: subscriberProfiles },
    { data: monthlyDonationRows },
    { data: donationTotals },
    postMediaUsage,
    chatMediaUsage,
    r2MediaUsage
  ] = await Promise.all([
    admin
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("publish_at", monthStart),
    admin
      .from("profiles")
      .select("tier, access_status, total_donations")
      .neq("role", "admin"),
    admin
      .from("donation_events")
      .select("amount")
      .eq("donation_year", donationYear)
      .eq("donation_month", donationMonth),
    admin.from("profiles").select("total_donations").neq("role", "admin"),
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

  const monthlyDonations = (monthlyDonationRows ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0
  );

  const totalDonations = (donationTotals ?? []).reduce(
    (sum, row) => sum + Number(row.total_donations ?? 0),
    0
  );

  const totalStorageBytes =
    postMediaUsage.totalBytes + chatMediaUsage.totalBytes + r2MediaUsage.totalBytes;

  return (
    <PrivateShell profile={profile} admin>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">Аналитика</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Обзор Lumina Space</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65">
            Здесь собраны ключевые цифры проекта: публикации за месяц, оплаченные подписчики,
            донаты и объём медиа в хранилище.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin/posts"
              className="rounded-2xl bg-white px-4 py-3 font-medium text-background transition hover:bg-goldSoft"
            >
              Добавить пост
            </Link>
            <Link
              href="/admin/users"
              className="rounded-2xl border border-white/10 px-4 py-3 text-white/80 transition hover:border-accent/40 hover:text-white"
            >
              Открыть пользователей
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Постов за текущий месяц" value={monthlyPosts ?? 0} />
          <StatCard label="Донаты за текущий месяц" value={formatMoney(monthlyDonations)} accent="cyan" />
          <StatCard label="Все донаты за всё время" value={formatMoney(totalDonations)} />
          <StatCard
            label="Активных оплаченных подписчиков"
            value={paidSubscribers.length}
            accent="accent"
          />
          <StatCard label="VIP" value={vipCount} accent="cyan" />
          <StatCard label="Приближённый" value={closeCount} />
          <StatCard label="Наблюдатель" value={watcherCount} />
          <StatCard label="Медиа в хранилище" value={formatStorage(totalStorageBytes)} accent="cyan" />
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <h3 className="text-2xl font-semibold text-white">Что здесь считается</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-5 text-sm leading-7 text-white/70">
              В подписчиках учитываются только активные участники с оплатой. Администратор не
              попадает в эти цифры.
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-5 text-sm leading-7 text-white/70">
              Хранилище показывает общий объём файлов в Cloudflare R2 и legacy Supabase Storage,
              чтобы было понятно, когда пора делать чистку.
            </div>
          </div>
        </section>
      </div>
    </PrivateShell>
  );
}
