import Link from "next/link";
import { AdminChatComposer } from "@/components/chat/admin-chat-composer";
import { MessageThread } from "@/components/chat/message-thread";
import { ADMIN_BUTTON_SECONDARY_CLASS, ADMIN_PANEL_CLASS, ADMIN_PANEL_GLOW_CLASS } from "@/components/admin/theme";
import { getRecentChatMessages, getSignedChatMediaUrls } from "@/lib/data/chat";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { MemberChatMessage, Profile } from "@/lib/types";

type ChatSummary = {
  profileId: string;
  label: string;
  lastAt: string;
  unreadCount: number;
  active: boolean;
};

function summarizeLabel(profile: Pick<Profile, "display_name" | "nickname" | "email" | "telegram_username"> | null) {
  return profile?.display_name || profile?.nickname || profile?.telegram_username || profile?.email || "Пользователь";
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

  const summaries = [...threadMap.values()].sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
  );

  const fallbackProfileId = profiles[0]?.id ?? summaries[0]?.profileId ?? null;
  const activeProfileId = selectedProfileId && profileMap.has(selectedProfileId) ? selectedProfileId : fallbackProfileId;
  const threadProfile = activeProfileId ? profileMap.get(activeProfileId) ?? null : null;
  const threadLabel = summarizeLabel(threadProfile);

  const threadMessages = activeProfileId ? await getRecentChatMessages(admin, activeProfileId) : [];
  const signedMediaUrls = await getSignedChatMediaUrls(
    threadMessages.map((message) => message.media_path).filter((path): path is string => Boolean(path))
  );
  const messagesWithMedia = threadMessages.map((message) => ({
    ...message,
    media_url: message.media_path ? signedMediaUrls[message.media_path] ?? null : null
  }));

  return (
    <section className={ADMIN_PANEL_CLASS}>
      <div className={ADMIN_PANEL_GLOW_CLASS} />
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-[1.15rem] font-semibold text-white">Чат с пользователями</h2>
            <p className="mt-1 text-sm text-white/45">Обсуждение внутренней покупки и быстрые ответы прямо из админки.</p>
          </div>
          {activeProfileId ? (
            <Link href={`/tg/admin/users?chat=${activeProfileId}`} className={ADMIN_BUTTON_SECONDARY_CLASS}>
              Открыть диалог
            </Link>
          ) : null}
        </div>

        <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-2 rounded-[22px] border border-white/10 bg-black/12 p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Диалоги</p>
            {summaries.length ? (
              <div className="space-y-2">
                {summaries.map((summary) => (
                  <Link
                    key={summary.profileId}
                    href={`/tg/admin/users?chat=${summary.profileId}`}
                    className={`block rounded-[18px] border px-3 py-3 text-sm transition ${
                      summary.profileId === activeProfileId
                        ? "border-white/18 bg-white/[0.08] text-white"
                        : "border-white/10 bg-white/[0.03] text-white/72 hover:border-white/16 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate">{summary.label}</span>
                      {summary.unreadCount ? (
                        <span className="rounded-full border border-cyanGlow/30 bg-cyanGlow/10 px-2 py-0.5 text-[11px] text-cyanGlow">
                          {summary.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-white/42">
                      {new Date(summary.lastAt).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/10 px-3 py-4 text-sm text-white/45">
                Пока нет переписки.
              </div>
            )}
          </aside>

          <div className="space-y-4">
            <div className="rounded-[22px] border border-white/10 bg-black/10 p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Активный диалог</p>
                  <h3 className="mt-1 font-display text-[1.1rem] font-semibold text-white">{threadLabel}</h3>
                </div>
                {activeProfileId ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/55">
                    ID: {activeProfileId}
                  </span>
                ) : null}
              </div>
            </div>

            {activeProfileId ? (
              <>
                <MessageThread
                  messages={messagesWithMedia}
                  memberLabel={threadLabel}
                  emptyLabel="Напиши первым, если нужно обсудить внутреннюю покупку."
                  refreshIntervalMs={15000}
                />
                <AdminChatComposer profileId={activeProfileId} memberLabel={threadLabel} />
              </>
            ) : (
              <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-6 text-sm text-white/50">
                Выбери пользователя слева, чтобы открыть чат.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
