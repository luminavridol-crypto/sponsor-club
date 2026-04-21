export const dynamic = "force-dynamic";

import { sendMemberChatMessageAction } from "@/app/actions";
import { MessageThread } from "@/components/chat/message-thread";
import { PrivateShell } from "@/components/layout/private-shell";
import { requireProfile } from "@/lib/auth/guards";
import {
  cleanupOldChatMessages,
  getRecentChatMessages,
  getSignedChatMediaUrls,
  markChatReadByMember
} from "@/lib/data/chat";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function MemberChatPage() {
  const profile = await requireProfile();
  const admin = createAdminSupabaseClient();
  await cleanupOldChatMessages(admin);
  await markChatReadByMember(admin, profile.id);
  const rawMessages = await getRecentChatMessages(admin, profile.id);
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
    <PrivateShell profile={profile}>
      <section className="space-y-5">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-cyanGlow">Chat</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Чат с Lumina</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">
            Здесь можно общаться напрямую с автором. Новые сообщения подтягиваются автоматически.
          </p>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <MessageThread
            messages={messages}
            memberLabel="Ты"
            adminLabel="Lumina"
            emptyLabel="Пока переписка пустая. Напиши первое сообщение."
          />

          <form action={sendMemberChatMessageAction} className="mt-5 space-y-3">
            <textarea
              name="body"
              placeholder="Напиши сообщение Lumina..."
              className="min-h-[140px]"
            />
            <button className="rounded-2xl border border-cyanGlow/30 bg-cyanGlow/10 px-5 py-3 text-sm font-medium text-cyanGlow transition hover:bg-cyanGlow/20">
              Отправить сообщение
            </button>
          </form>
        </div>
      </section>
    </PrivateShell>
  );
}
