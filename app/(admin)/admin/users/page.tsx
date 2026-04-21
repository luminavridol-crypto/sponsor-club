export const dynamic = "force-dynamic";

import { PrivateShell } from "@/components/layout/private-shell";
import { UserCard } from "@/components/admin/user-card";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { DonationEvent, MemberChatMessage, Profile } from "@/lib/types";
import { getVipProgress } from "@/lib/utils/vip";

function getTierSortWeight(user: Profile) {
  if (user.tier === "tier_3") return 3;
  if (user.tier === "tier_2") return 2;
  return 1;
}

function sortUsers(users: Profile[]) {
  return [...users].sort((a, b) => {
    const tierDiff = getTierSortWeight(b) - getTierSortWeight(a);
    if (tierDiff !== 0) return tierDiff;

    if (a.tier === "tier_3" && b.tier === "tier_3") {
      const vipDiff =
        getVipProgress(b.total_donations).current.level - getVipProgress(a.total_donations).current.level;
      if (vipDiff !== 0) return vipDiff;

      const donationDiff = Number(b.total_donations || 0) - Number(a.total_donations || 0);
      if (donationDiff !== 0) return donationDiff;
    }

    if (a.tier === "tier_2" && b.tier === "tier_2") {
      const donationDiff = Number(b.total_donations || 0) - Number(a.total_donations || 0);
      if (donationDiff !== 0) return donationDiff;
    }

    if (a.tier === "tier_1" && b.tier === "tier_1") {
      const donationDiff = Number(b.total_donations || 0) - Number(a.total_donations || 0);
      if (donationDiff !== 0) return donationDiff;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export default async function AdminUsersPage() {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();

  const [{ data: profilesData }, { data: donationEventsData }, { data: chatMessagesData }] = await Promise.all([
    admin.from("profiles").select("*"),
    admin.from("donation_events").select("*").order("created_at", { ascending: false }),
    admin.from("member_chat_messages").select("*").order("created_at", { ascending: true })
  ]);

  const users = sortUsers(((profilesData ?? []) as Profile[]).filter((user) => user.role !== "admin"));
  const donationEvents = (donationEventsData ?? []) as DonationEvent[];
  const chatMessages = (chatMessagesData ?? []) as MemberChatMessage[];
  const donationMap = new Map<string, DonationEvent[]>();
  const chatMap = new Map<string, MemberChatMessage[]>();

  donationEvents.forEach((event) => {
    const existing = donationMap.get(event.profile_id) ?? [];
    existing.push(event);
    donationMap.set(event.profile_id, existing);
  });

  chatMessages.forEach((message) => {
    const existing = chatMap.get(message.profile_id) ?? [];
    existing.push(message);
    chatMap.set(message.profile_id, existing);
  });

  return (
    <PrivateShell profile={profile} admin>
      <div className="space-y-4">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">Users Manager</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Пользователи</h2>
          <p className="mt-3 text-sm text-white/60">
            Список отсортирован по приоритету: сначала VIP по их VIP-уровню, потом Приближённые,
            ниже Наблюдатели.
          </p>
        </section>

        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            isCurrentAdmin={user.id === profile.id}
            donationEvents={donationMap.get(user.id) ?? []}
            chatMessages={chatMap.get(user.id) ?? []}
          />
        ))}
      </div>
    </PrivateShell>
  );
}
