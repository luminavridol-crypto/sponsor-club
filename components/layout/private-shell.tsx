import { ReactNode } from "react";
import { BirthdayCalendar } from "@/components/admin/birthday-calendar";
import { signOutAction } from "@/app/actions";
import { getAdminUnreadChatProfileIds, hasUnreadMemberChat } from "@/lib/data/chat";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Profile, Tier } from "@/lib/types";
import { PrivateNav } from "@/components/layout/private-nav";
import { canAccessTier } from "@/lib/utils/tier";
import { TIER_LABELS } from "@/lib/utils/tier";

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
  let hasUnreadContent = false;
  let birthdays:
    | Array<{
        id: string;
        displayName: string;
        birthDate: string;
        tierLabel: string;
        tierKey: Tier;
      }>
    | undefined;

  if (admin) {
    const { data: birthdayProfiles } = await adminClient
      .from("profiles")
      .select("id, display_name, email, birth_date, tier, access_status")
      .neq("role", "admin")
      .not("birth_date", "is", null);

    const unreadProfileIds = await getAdminUnreadChatProfileIds(adminClient);
    hasUnreadChat = unreadProfileIds.length > 0;

    birthdays = (birthdayProfiles ?? [])
      .filter((item) => item.birth_date && item.access_status === "active")
      .map((item) => ({
        id: item.id,
        displayName: item.display_name || item.email || "Подписчик",
        birthDate: item.birth_date as string,
        tierLabel: TIER_LABELS[item.tier as Tier],
        tierKey: item.tier as Tier
      }));
  } else {
    hasUnreadChat = await hasUnreadMemberChat(adminClient, profile.id);

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
        <div className="mb-6 flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
          <div>
            <p className="text-sm text-white/50">Приватный клуб Lumina</p>
            <h1 className="text-xl font-semibold text-white">
              {profile.display_name || "Добро пожаловать обратно"}
            </h1>
          </div>
          <form action={signOutAction}>
            <button className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-accent/40 hover:text-white">
              Выйти
            </button>
          </form>
        </div>

        {admin ? (
          <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_430px]">
            <PrivateNav profile={profile} admin hasUnreadChat={hasUnreadChat} />
            <div>{children}</div>
            <aside className="xl:sticky xl:top-6 xl:h-fit">
              <BirthdayCalendar birthdays={birthdays ?? []} />
            </aside>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <PrivateNav
              profile={profile}
              admin={admin}
              hasUnreadChat={hasUnreadChat}
              hasUnreadContent={hasUnreadContent}
            />
            <div>{children}</div>
          </div>
        )}
      </div>
    </div>
  );
}
