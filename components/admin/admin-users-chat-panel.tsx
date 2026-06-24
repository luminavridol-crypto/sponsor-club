import Link from "next/link";
import { AdminChatComposer } from "@/components/chat/admin-chat-composer";
import { MessageThread } from "@/components/chat/message-thread";
import { ADMIN_PANEL_CLASS, ADMIN_PANEL_GLOW_CLASS } from "@/components/admin/theme";
import { getRecentChatMessages, getSignedChatMediaUrls, markChatReadByAdmin } from "@/lib/data/chat";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { MemberChatMessage, Profile } from "@/lib/types";

type ChatSummary = {
  profileId: string;
  label: string;
  lastAt: string | null;
  unreadCount: number;
  active: boolean;
};

function summarizeLabel(profile: Pick<Profile, "display_name" | "nickname" | "email" | "telegram_username"> | null) {
  return profile?.display_name || profile?.nickname || profile?.telegram_username || profile?.email || "Пользователь";
}

function getInitials(label: string) {
  return (
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

function formatThreadTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export async function AdminUsersChatPanel({
  selectedProfileId
}: {
  selectedProfileId?: string;
}) {
  const admin = createAdminSupabaseClient();

  const [{ data: messagesData }, { data: profilesData }] = await Promise.all([
    admin
      .from("member_chat_messages")
      .select("id, profile_id, sender_role, body, media_path, media_type, read_by_admin_at, read_by_member_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("profiles")
      .select("id, display_name, nickname, email, telegram_username, role, access_status, tier, created_at")
      .eq("role", "member")
      .eq("access_status", "active")
      .order("created_at", { ascending: false })
  ]);

  const profiles = (profilesData ?? []) as Profile[];
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile] as const));

  const threadMap = new Map<string, ChatSummary>();
  for (const message of (messagesData ?? []) as MemberChatMessage[]) {
    const profile = profileMap.get(message.profile_id);
    const label = summarizeLabel(profile ?? null);
    const existing = threadMap.get(message.profile_id);

    if (!existing) {
      threadMap.set(message.profile_id, {
        profileId: message.profile_id,
        label,
        lastAt: message.created_at,
        unreadCount: message.sender_role === "member" && !message.read_by_admin_at ? 1 : 0,
        active: Boolean(profile)
      });
      continue;
    }

    existing.unreadCount += message.sender_role === "member" && !message.read_by_admin_at ? 1 : 0;
    existing.lastAt = message.created_at;
    threadMap.set(message.profile_id, existing);
  }

  const summaries = profiles
    .map((profile) => {
      const existing = threadMap.get(profile.id);

      return (
        existing ?? {
          profileId: profile.id,
          label: summarizeLabel(profile),
          lastAt: null,
          unreadCount: 0,
          active: true
        }
      );
    })
    .sort((a, b) => {
      if (a.lastAt && b.lastAt) {
        return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
      }

      if (a.lastAt) {
        return -1;
      }

      if (b.lastAt) {
        return 1;
      }

      return a.label.localeCompare(b.label, "ru");
    });

  const activeProfileId = selectedProfileId && profileMap.has(selectedProfileId) ? selectedProfileId : null;
  const threadProfile = activeProfileId ? profileMap.get(activeProfileId) ?? null : null;
  const threadLabel = summarizeLabel(threadProfile);
  const threadSubtitle = threadProfile?.telegram_username
    ? `@${threadProfile.telegram_username.replace(/^@/, "")}`
    : threadProfile?.email || "Личный чат";

  if (activeProfileId) {
    await markChatReadByAdmin(admin, activeProfileId);
  }

  const threadMessages = activeProfileId ? await getRecentChatMessages(admin, activeProfileId) : [];
  const signedMediaUrls = await getSignedChatMediaUrls(
    threadMessages.map((message) => message.media_path).filter((path): path is string => Boolean(path))
  );
  const messagesWithMedia = threadMessages.map((message) => ({
    ...message,
    media_url: message.media_path ? signedMediaUrls[message.media_path] ?? null : null
  }));
  const summariesWithReadState = summaries.map((summary) =>
    summary.profileId === activeProfileId ? { ...summary, unreadCount: 0 } : summary
  );

  return (
    <section className={ADMIN_PANEL_CLASS}>
      <div className={ADMIN_PANEL_GLOW_CLASS} />
      <div className="relative">
        <div className="grid gap-3 xl:grid-cols-[290px_minmax(0,1fr)]">
          <aside className={`overflow-hidden rounded-[28px] border border-white/10 bg-black/18 ${activeProfileId ? "order-2 xl:order-1" : ""}`}>
            <div className="border-b border-white/8 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/38">Участники</p>
              <h2 className="mt-2 font-display text-[1.2rem] font-semibold text-white">Все участники клуба</h2>
            </div>

            <div className="space-y-2 p-3">
              {summariesWithReadState.length ? (
                summariesWithReadState.map((summary) => (
                  <Link
                    key={summary.profileId}
                    href={summary.profileId === activeProfileId ? "/tg/admin/chat" : `/tg/admin/chat?chat=${summary.profileId}`}
                    className={`flex items-center gap-3 rounded-[22px] border px-3 py-3 transition ${
                      summary.profileId === activeProfileId
                        ? "border-white/14 bg-white/[0.05] shadow-[0_16px_34px_rgba(0,0,0,0.12)]"
                        : summary.unreadCount
                          ? "border-cyanGlow/22 bg-cyanGlow/10"
                        : "border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-sm font-semibold text-white">
                      {getInitials(summary.label)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-white">{summary.label}</p>
                        <p className="shrink-0 text-[11px] text-white/38">
                          {summary.lastAt ? formatThreadTime(summary.lastAt) : ""}
                        </p>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-3">
                        <p className="truncate text-xs text-white/42">
                          {summary.profileId === activeProfileId
                            ? "Свернуть чат"
                            : summary.lastAt
                              ? "Открыть диалог"
                              : "Без сообщений"}
                        </p>
                        {summary.unreadCount ? (
                          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-cyanGlow px-2 py-0.5 text-[11px] font-semibold text-slate-950">
                            {summary.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-5 text-sm text-white/45">
                  Пока нет участников.
                </div>
              )}
            </div>
          </aside>

          {activeProfileId ? (
            <div className="order-1 overflow-hidden rounded-[28px] border border-white/10 bg-[#171923] xl:order-2">
              <>
                <div className="flex items-center gap-3 border-b border-white/8 bg-black/18 px-4 py-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-cyanGlow/20 to-white/8 text-sm font-semibold text-white">
                    {getInitials(threadLabel)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[1rem] font-semibold text-white">{threadLabel}</h3>
                    <p className="truncate text-sm text-white/45">{threadSubtitle}</p>
                  </div>
                  <Link
                    href="/tg/admin/chat"
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/70 transition hover:border-cyanGlow/30 hover:bg-cyanGlow/10 hover:text-white"
                  >
                    Свернуть
                  </Link>
                  <div className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/45 sm:block">
                    {activeProfileId}
                  </div>
                </div>

                <div className="bg-[radial-gradient(circle_at_top,rgba(90,117,173,0.12),transparent_28%),linear-gradient(180deg,#1a1d27_0%,#151821_100%)] p-3 sm:p-4">
                  <MessageThread
                    messages={messagesWithMedia}
                    memberLabel={threadLabel}
                    emptyLabel="Здесь появится переписка с участником."
                    refreshIntervalMs={15000}
                  />
                  <AdminChatComposer profileId={activeProfileId} memberLabel={threadLabel} />
                </div>
              </>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
