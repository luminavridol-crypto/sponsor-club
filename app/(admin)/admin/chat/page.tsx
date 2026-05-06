export const dynamic = "force-dynamic";

import Image from "next/image";
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
  getChatCutoffIso,
  getRecentChatMessages,
  getSignedChatMediaUrls,
  markChatReadByAdmin
} from "@/lib/data/chat";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { MemberChatMessage, Profile } from "@/lib/types";
import { TIER_LABELS } from "@/lib/utils/tier";
import { getVipProgress } from "@/lib/utils/vip";

function formatPreviewTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getProfileLabel(user: Profile) {
  return user.display_name || user.nickname || "Без имени";
}

function getAvatarFallback(user: Profile) {
  const label = getProfileLabel(user).trim();
  return label.slice(0, 1).toUpperCase() || "L";
}

function getMessagePreview(message: MemberChatMessage | null | undefined) {
  if (!message) {
    return "Пока нет сообщений";
  }

  if (message.body?.trim()) {
    return message.sender_role === "admin" ? `Вы: ${message.body.trim()}` : message.body.trim();
  }

  if (message.media_type === "video") {
    return message.sender_role === "admin" ? "Вы: Видео" : "Видео";
  }

  if (message.media_type === "image") {
    return message.sender_role === "admin" ? "Вы: Фото" : "Фото";
  }

  return message.sender_role === "admin" ? "Вы: Вложение" : "Вложение";
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

  const [{ data: usersData }, { data: chatIndexRows }] = await Promise.all([
    admin
      .from("profiles")
      .select("*")
      .neq("role", "admin")
      .eq("access_status", "active")
      .order("created_at", { ascending: false }),
    admin
      .from("member_chat_messages")
      .select("profile_id, body, media_type, sender_role, created_at, read_by_admin_at")
      .gte("created_at", getChatCutoffIso())
      .order("created_at", { ascending: false })
  ]);

  const users = (usersData ?? []) as Profile[];
  const latestMessageByProfile = new Map<string, MemberChatMessage>();

  for (const row of (chatIndexRows ?? []) as MemberChatMessage[]) {
    if (!latestMessageByProfile.has(row.profile_id)) {
      latestMessageByProfile.set(row.profile_id, row);
    }
  }

  const usersSorted = [...users].sort((left, right) => {
    const leftMessage = latestMessageByProfile.get(left.id);
    const rightMessage = latestMessageByProfile.get(right.id);

    if (leftMessage && rightMessage) {
      return new Date(rightMessage.created_at).getTime() - new Date(leftMessage.created_at).getTime();
    }

    if (rightMessage) return 1;
    if (leftMessage) return -1;
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });

  const selectedUser = selectedUserId
    ? usersSorted.find((user) => user.id === selectedUserId) ?? null
    : null;

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

        <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-3 sm:p-4">
            <div className="max-h-[760px] overflow-y-auto pr-1">
              {usersSorted.length ? (
                <div className="space-y-2">
                  {usersSorted.map((user) => {
                    const active = selectedUser?.id === user.id;
                    const hasUnread = unreadProfileIds.includes(user.id);
                    const vip = getVipProgress(user.total_donations);
                    const latestMessage = latestMessageByProfile.get(user.id) ?? null;

                    return (
                      <Link
                        key={user.id}
                        href={`/admin/chat?user=${user.id}`}
                        className={`flex items-center gap-3 rounded-[26px] px-3 py-3 transition ${
                          active
                            ? "bg-white/10 shadow-[0_0_30px_rgba(255,92,208,0.1)]"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <div className="relative shrink-0">
                          {user.avatar_url ? (
                            <Image
                              src={user.avatar_url}
                              alt={getProfileLabel(user)}
                              width={52}
                              height={52}
                              unoptimized
                              className="h-13 w-13 rounded-full border border-white/10 object-cover"
                            />
                          ) : (
                            <div className="flex h-13 w-13 items-center justify-center rounded-full border border-white/10 bg-accent/15 text-lg font-semibold text-white">
                              {getAvatarFallback(user)}
                            </div>
                          )}
                          {hasUnread ? (
                            <span className="absolute bottom-0 right-0 inline-flex h-3.5 w-3.5 rounded-full border-2 border-[#171722] bg-cyanGlow shadow-[0_0_12px_rgba(111,234,255,0.8)]" />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-xl font-semibold text-white">
                                {getProfileLabel(user)}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/75">
                                  {TIER_LABELS[user.tier]}
                                </span>
                                <span className="rounded-full border border-cyanGlow/25 bg-cyanGlow/10 px-2.5 py-1 text-[11px] text-cyanGlow">
                                  VIP {vip.current.level}
                                </span>
                              </div>
                            </div>
                            <span className="shrink-0 pt-1 text-xs text-white/35">
                              {latestMessage ? formatPreviewTime(latestMessage.created_at) : ""}
                            </span>
                          </div>

                          <p className="mt-2 truncate text-sm text-white/55">
                            {getMessagePreview(latestMessage)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
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
                <div className="flex min-w-0 items-start gap-4">
                  {selectedUser.avatar_url ? (
                    <Image
                      src={selectedUser.avatar_url}
                      alt={getProfileLabel(selectedUser)}
                      width={64}
                      height={64}
                      unoptimized
                      className="h-16 w-16 rounded-full border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/10 bg-accent/15 text-2xl font-semibold text-white">
                      {getAvatarFallback(selectedUser)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm uppercase tracking-[0.28em] text-cyanGlow">Диалог</p>
                    <h3 className="mt-3 truncate text-2xl font-semibold text-white">
                      {getProfileLabel(selectedUser)}
                    </h3>
                    <p className="mt-2 break-all text-sm text-white/55">{selectedUser.email}</p>
                  </div>
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
                memberLabel={getProfileLabel(selectedUser)}
                adminLabel="Lumina"
                emptyLabel="Переписки пока нет."
              />

              <AdminChatComposer
                profileId={selectedUser.id}
                memberLabel={selectedUser.display_name || selectedUser.email}
              />
            </div>
          ) : (
            <div className="rounded-[32px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-white/55">
              Выберите чат слева.
            </div>
          )}
        </div>
      </section>
    </PrivateShell>
  );
}
