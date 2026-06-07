export const dynamic = "force-dynamic";

import { Suspense } from "react";
import {
  AdminUsersCleanupPanel,
  AdminUsersCleanupPanelFallback
} from "@/components/admin/admin-users-cleanup-panel";
import { BirthdayCalendar } from "@/components/admin/birthday-calendar";
import {
  ADMIN_EYEBROW_CLASS,
  ADMIN_HEADER_CLASS,
  ADMIN_PANEL_CLASS,
  ADMIN_PANEL_GLOW_CLASS,
  ADMIN_SHELL_CLASS,
  ADMIN_SUBPANEL_CLASS
} from "@/components/admin/theme";
import { UserCard } from "@/components/admin/user-card";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { getSignedAvatarUrls } from "@/lib/data/profiles";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { DonationEvent, Profile } from "@/lib/types";
import { TIER_LABELS } from "@/lib/utils/tier";

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

function CompactAnalyticsRow({
  items
}: {
  items: { label: string; value: string | number }[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-[22px] border border-white/10 bg-black/18 px-4 py-3">
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

  const [{ data: profilesData }, { data: donationEventsData }, { data: purchaseRequests }] =
    await Promise.all([
      admin.from("profiles").select("*"),
      admin.from("donation_events").select("*").order("created_at", { ascending: false }),
      admin.from("purchase_requests").select("id, status")
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
  const afterDarkCount = activeUsers.filter((user) => user.tier === "tier_4").length;
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

  return (
    <MiniAppShell
      profile={profile}
      title="Пользователи"
      shellClassName={ADMIN_SHELL_CLASS}
      headerClassName={ADMIN_HEADER_CLASS}
      eyebrowClassName={ADMIN_EYEBROW_CLASS}
    >
      <section className={ADMIN_PANEL_CLASS}>
        <div className={ADMIN_PANEL_GLOW_CLASS} />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-[1.5rem] font-semibold text-white">Сводка</h2>
            </div>
          </div>
          <div className="mt-4">
            <CompactAnalyticsRow
              items={[
                { label: "Участники", value: activeUsers.length },
                { label: "After Dark", value: afterDarkCount },
                { label: "VIP", value: vipCount },
                { label: "Приближённые", value: closeCount },
                { label: "Наблюдатели", value: watcherCount },
                { label: "Ожидают", value: pendingRequestsCount },
                { label: "Профилей", value: users.length }
              ]}
            />
          </div>
        </div>
      </section>

      <BirthdayCalendar birthdays={birthdayPeople} />

      <Suspense fallback={<AdminUsersCleanupPanelFallback />}>
        <AdminUsersCleanupPanel />
      </Suspense>

      <section className="space-y-3">
        {usersWithAvatars.length ? (
          usersWithAvatars.map((user) => (
            <UserCard
              key={`${user.id}-${user.tier}-${user.access_expires_at ?? "none"}-${(user.admin_badges ?? []).join(",")}`}
              user={user}
              isCurrentAdmin={user.id === profile.id}
              donationEvents={donationMap.get(user.id) ?? []}
              hideUnlimitedButton
            />
          ))
        ) : (
          <div className={`${ADMIN_SUBPANEL_CLASS} text-sm text-white/60`}>Пользователей пока нет.</div>
        )}
      </section>
    </MiniAppShell>
  );
}
