import Link from "next/link";
import { PrivateShell } from "@/components/layout/private-shell";
import { StatCard } from "@/components/admin/stat-card";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function AdminDashboardPage() {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();

  const [
    { count: usersCount },
    { count: postsCount },
    { data: tierGroups },
    { count: purchaseRequestsCount }
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("posts").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("tier"),
    admin
      .from("purchase_requests")
      .select("*", { count: "exact", head: true })
      .in("status", ["new", "in_progress"])
  ]);

  const tierCounts = (tierGroups ?? []).reduce<Record<string, number>>((acc, row) => {
    const tier = String(row.tier);
    acc[tier] = (acc[tier] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <PrivateShell profile={profile} admin>
      <section className="space-y-6">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">Admin Control Room</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Управление клубом</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">
            Отсюда вы управляете инвайтами, пользователями и публикациями. Все действия админа
            идут через server actions и service role на сервере.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Всего пользователей" value={usersCount ?? 0} />
          <StatCard label="Всего постов" value={postsCount ?? 0} tone="accent" />
          <StatCard label="Tier 1" value={tierCounts.tier_1 ?? 0} />
          <StatCard label="Tier 2" value={tierCounts.tier_2 ?? 0} tone="accent" />
          <StatCard label="Tier 3" value={tierCounts.tier_3 ?? 0} tone="cyan" />
          <StatCard label="Новые заявки" value={purchaseRequestsCount ?? 0} tone="accent" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Link
            href="/admin/posts"
            className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:border-accent/30 hover:bg-white/10"
          >
            <h3 className="text-xl font-semibold text-white">Посты</h3>
            <p className="mt-2 text-sm text-white/55">Создание, редактирование, удаление, загрузка media.</p>
          </Link>
          <Link
            href="/admin/invites"
            className="rounded-3xl border border-accent/30 bg-accent/10 p-5 transition hover:bg-accent/20"
          >
            <h3 className="text-xl font-semibold text-white">Приглашения</h3>
            <p className="mt-2 text-sm text-white/70">Генерация invite-кодов и приватных ссылок.</p>
          </Link>
          <Link
            href="/admin/users"
            className="rounded-3xl border border-cyanGlow/30 bg-cyanGlow/10 p-5 transition hover:bg-cyanGlow/15"
          >
            <h3 className="text-xl font-semibold text-white">Пользователи</h3>
            <p className="mt-2 text-sm text-white/70">Tier, блокировка и ручное управление доступом.</p>
          </Link>
          <Link
            href="/admin/requests"
            className="rounded-3xl border border-accent/30 bg-accent/10 p-5 transition hover:bg-accent/20"
          >
            <h3 className="text-xl font-semibold text-white">Заявки на покупку</h3>
            <p className="mt-2 text-sm text-white/70">
              Новые обращения по доступу и ручная обработка оплаты.
            </p>
          </Link>
        </div>
      </section>
    </PrivateShell>
  );
}
