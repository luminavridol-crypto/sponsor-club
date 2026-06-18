export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { AdminUsersBrowser } from "@/components/admin/admin-users-browser";
import {
  AdminUsersCleanupPanel,
  AdminUsersCleanupPanelFallback
} from "@/components/admin/admin-users-cleanup-panel";
import { AdminUsersChatPanel } from "@/components/admin/admin-users-chat-panel";
import { BirthdayCalendar } from "@/components/admin/birthday-calendar";
import {
  ADMIN_EYEBROW_CLASS,
  ADMIN_HEADER_CLASS,
  ADMIN_PANEL_CLASS,
  ADMIN_PANEL_GLOW_CLASS,
  ADMIN_SHELL_CLASS
} from "@/components/admin/theme";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { getSignedAvatarUrls } from "@/lib/data/profiles";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { DonationEvent, Profile, PurchaseRequest } from "@/lib/types";
import { normalizeProfileTier, TIER_LABELS } from "@/lib/utils/tier";

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

export default async function TelegramAdminUsersPage({
  searchParams
}: {
  searchParams?: Promise<{ chat?: string | string[] }>;
}) {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();
  const params = (await searchParams) ?? {};
  const selectedChatId = typeof params.chat === "string" ? params.chat : Array.isArray(params.chat) ? params.chat[0] : undefined;

  const [{ data: profilesData }, { data: donationEventsData }, { data: purchaseRequestsData }] =
    await Promise.all([
      admin.from("profiles").select("*"),
      admin.from("donation_events").select("*").order("created_at", { ascending: false }),
      admin
        .from("purchase_requests")
        .select("id, tier, display_name, email, country, contact, status, approved_for_club, created_at, updated_at")
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
  const donationMap = new Map<string, DonationEvent[]>();

  donationEvents.forEach((event) => {
    const existing = donationMap.get(event.profile_id) ?? [];
    existing.push(event);
    donationMap.set(event.profile_id, existing);
  });

  const activeUsers = users.filter((user) => user.access_status === "active");
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
              <h2 className="font-display text-[1.2rem] font-semibold text-white">Сводка</h2>
            </div>
          </div>
          <div className="mt-4">
            <AdminUsersBrowser
              users={usersWithAvatars.map((user) => ({
                ...user,
                donationEvents: donationMap.get(user.id) ?? []
              }))}
              currentAdminId={profile.id}
              requests={purchaseRequests}
            />
          </div>
        </div>
      </section>

      <BirthdayCalendar birthdays={birthdayPeople} />

      <Suspense fallback={<AdminUsersCleanupPanelFallback />}>
        <AdminUsersCleanupPanel />
      </Suspense>

      <AdminUsersChatPanel selectedProfileId={selectedChatId} />
    </MiniAppShell>
  );
}
