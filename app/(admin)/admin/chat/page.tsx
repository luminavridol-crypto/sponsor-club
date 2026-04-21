export const dynamic = "force-dynamic";

import Link from "next/link";
import { AdminChatComposer } from "@/components/chat/admin-chat-composer";
import { MessageThread } from "@/components/chat/message-thread";
import { PrivateShell } from "@/components/layout/private-shell";
import { requireAdmin } from "@/lib/auth/guards";
import {
  cleanupOldChatMessages,
  getAdminUnreadChatProfileIds,
  getRecentChatMessages,
  getSignedChatMediaUrls,
  markChatReadByAdmin
} from "@/lib/data/chat";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Profile } from "@/lib/types";
import { TIER_LABELS } from "@/lib/utils/tier";

function formatTime(value: string | null) {
  if (!value) {
    return "Сообщений пока нет";
  }

  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function AdminChatPage({
  searchParams
}: {
  searchParams?: Promise<{ user?: string }>;
}) {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedUserId = resolvedSearchParams.user ?? null;

  await cleanupOldChatMessages(admin);

  const { data: usersData } = await admin
    .from("profiles")
    .select("*")
    .neq("role", "admin")
    .eq("access_status", "active")
    .order("created_at", { ascending: false });

  const users = (usersData ?? []) as Profile[];
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? users[0] ?? null;

  if (selectedUser) {
    await markChatReadByAdmin(admin, selectedUser.id);
  }

  const unreadProfileIds = await getAdminUnreadChatProfileIds(admin);

  const rawMessages = selectedUser ? await getRecentChatMessages(admin, selectedUser.id) : [];

  const signedChatMediaUrls = await getSignedChatMediaUrls(
    rawMessages
      .map((message) => message.media_path)
      .filter((value): value is string => Boolean(value))
  );

  const messages = rawMessages.map((message) => ({
    ...message,
    media_url: message.media_path ? signedChatMediaUrls[message.media_path] ?? null : null
  }));

  return (
    <PrivateShell profile={profile} admin>
      <section className="space-y-5">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-cyanGlow">Admin Chat</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Чаты с подписчиками</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
            Здесь только список участников. Нажимаешь на нужного человека и открываешь его
            переписку. Старые сообщения старше 30 дней удаляются автоматически.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-5">
            <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">Участники</p>
            <div className="mt-4 space-y-3">
              {users.length ? (
                users.map((user) => {
                  const active = selectedUser?.id === user.id;
                  const hasUnread = unreadProfileIds.includes(user.id);
                  const lastMessage = user.id === selectedUser?.id ? messages[messages.length - 1] : null;

                  return (
                    <article
                      key={user.id}
                      className={`rounded-3xl border p-4 transition ${
                        active
                          ? "border-accent/35 bg-accent/10 shadow-[0_0_30px_rgba(255,92,208,0.12)]"
                          : "border-white/10 bg-black/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-semibold text-white">
                          {user.display_name || "Без имени"}
                        </p>
                        {hasUnread ? (
                          <span className="inline-flex h-3 w-3 shrink-0 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.7)]" />
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-white/55">{user.email}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75">
                          {TIER_LABELS[user.tier]}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">
                          {formatTime(lastMessage?.created_at ?? null)}
                        </span>
                      </div>
                      <div className="mt-4">
                        <Link
                          href={`/admin/chat?user=${user.id}`}
                          className={`inline-flex rounded-2xl border px-4 py-2 text-sm transition ${
                            active
                              ? "border-accent/35 bg-accent/15 text-accentSoft"
                              : "border-white/10 text-white/80 hover:border-accent/30 hover:bg-white/5"
                          }`}
                        >
                          {active ? "Чат открыт" : "Открыть чат"}
                        </Link>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-white/10 bg-black/10 p-5 text-white/60">
                  Пока нет активных подписчиков для чата.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
            {selectedUser ? (
              <>
                <div className="mb-5">
                  <p className="text-sm uppercase tracking-[0.28em] text-cyanGlow">Открытый чат</p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">
                    {selectedUser.display_name || "Без имени"}
                  </h3>
                  <p className="mt-2 text-sm text-white/55">{selectedUser.email}</p>
                </div>

                <MessageThread
                  messages={messages}
                  memberLabel={selectedUser.display_name || selectedUser.email}
                  adminLabel="Lumina"
                  emptyLabel="Переписки пока нет."
                />

                <AdminChatComposer
                  profileId={selectedUser.id}
                  memberLabel={selectedUser.display_name || selectedUser.email}
                />
              </>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-black/10 p-6 text-white/60">
                Выбери участника слева, чтобы открыть переписку.
              </div>
            )}
          </div>
        </div>
      </section>
    </PrivateShell>
  );
}
