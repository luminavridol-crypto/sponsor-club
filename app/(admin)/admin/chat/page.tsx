export const dynamic = "force-dynamic";

import Link from "next/link";
import { deleteUserChatAction } from "@/app/actions";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
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
import { getVipProgress } from "@/lib/utils/vip";

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
  const selectedUser = selectedUserId ? users.find((user) => user.id === selectedUserId) ?? null : null;

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
        </div>

        <div className={`grid gap-5 ${selectedUser ? "xl:grid-cols-[380px_minmax(0,1fr)]" : ""}`}>
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
            <div className={`grid gap-3 ${selectedUser ? "" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
              {users.length ? (
                users.map((user) => {
                  const active = selectedUser?.id === user.id;
                  const hasUnread = unreadProfileIds.includes(user.id);
                  const vip = getVipProgress(user.total_donations);

                  return (
                    <Link
                      key={user.id}
                      href={`/admin/chat?user=${user.id}`}
                      className={`rounded-3xl border p-4 transition ${
                        active
                          ? "border-accent/35 bg-accent/10 shadow-[0_0_30px_rgba(255,92,208,0.12)]"
                          : "border-white/10 bg-black/10 hover:border-accent/30 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <p className="text-lg font-semibold text-white">
                          {user.display_name || user.nickname || "Без имени"}
                        </p>
                        {hasUnread ? (
                          <span className="inline-flex h-3 w-3 shrink-0 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.7)]" />
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75">
                          {TIER_LABELS[user.tier]}
                        </span>
                        <span className="rounded-full border border-cyanGlow/25 bg-cyanGlow/10 px-3 py-1 text-xs text-cyanGlow">
                          VIP {vip.current.level}
                        </span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-white/10 bg-black/10 p-5 text-white/60">
                  Пока нет активных подписчиков для чата.
                </div>
              )}
            </div>
          </div>

          {selectedUser ? (
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-6">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-cyanGlow">Открытый чат</p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">
                    {selectedUser.display_name || selectedUser.nickname || "Без имени"}
                  </h3>
                  <p className="mt-2 break-all text-sm text-white/55">{selectedUser.email}</p>
                </div>
                <ConfirmActionForm
                  action={deleteUserChatAction}
                  confirmMessage={`Точно очистить весь чат с ${
                    selectedUser.display_name || selectedUser.email
                  }? Все сообщения и вложения удалятся.`}
                  buttonLabel="Очистить чат"
                  buttonClassName="inline-flex rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-400/20"
                  hiddenFields={[{ name: "profileId", value: selectedUser.id }]}
                />
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
            </div>
          ) : null}
        </div>
      </section>
    </PrivateShell>
  );
}
