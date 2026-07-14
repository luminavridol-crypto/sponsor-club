export const dynamic = "force-dynamic";

import { MemberChatThread } from "@/components/chat/member-chat-thread";
import { MemberChatComposer } from "@/components/chat/member-chat-composer";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { hasClubAccess } from "@/lib/auth/access";
import { requireAnyProfile } from "@/lib/auth/guards";
import { getRecentChatMessages, getSignedChatMediaUrls, markChatReadByMember } from "@/lib/data/chat";
import {
  CHAT_MESSAGE_PACK_PRICE_EUR,
  CHAT_MESSAGE_PACK_SIZE,
  getChatMessageUsage
} from "@/lib/data/chat-limits";
import { hasApprovedPurchasedPosts } from "@/lib/data/post-purchases";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function TelegramChatPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireAnyProfile();
  const admin = createAdminSupabaseClient();
  const params = (await searchParams) ?? {};
  const hasContentAccess = hasClubAccess(profile) || (await hasApprovedPurchasedPosts(profile));
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const sent = Array.isArray(params.sent) ? params.sent[0] : params.sent;

  const [messages, chatUsage] = await Promise.all([
    getRecentChatMessages(admin, profile.id),
    getChatMessageUsage(admin, profile),
    markChatReadByMember(admin, profile.id)
  ]);
  const isLimitReached = !chatUsage.isUnlimited && (chatUsage.remaining ?? 0) <= 0;

  const mediaMap = await getSignedChatMediaUrls(
    messages.map((message) => message.media_path).filter((value): value is string => Boolean(value))
  );

  const threadMessages = messages.map((message) => ({
    ...message,
    media_url: message.media_path ? mediaMap[message.media_path] ?? null : null
  }));

  return (
    <MiniAppShell
      profile={profile}
      title="Чат"
      hasAccess={hasContentAccess}
    >
      {error ? (
        <section className="rounded-[24px] bg-rose-400/12 px-4 py-4 text-sm text-rose-100">
          {error === "limit"
            ? "Лимит сообщений на этот месяц закончился. Можно купить дополнительный пакет ниже."
            : error === "empty"
              ? "Напиши сообщение или прикрепи файл/голосовое."
              : error === "upload"
                ? "Не получилось загрузить вложение. Проверь размер и попробуй ещё раз."
                : error === "send"
                  ? "Не получилось отправить сообщение. Попробуй ещё раз."
                  : "В чат можно загрузить изображение или голосовое."}
        </section>
      ) : null}

      {sent ? (
        <section className="rounded-[24px] bg-emerald-400/12 px-4 py-4 text-sm text-emerald-100">
          Сообщение отправлено.
        </section>
      ) : null}

      <section className="club-comment-section rounded-[28px] border px-5 py-5 text-white shadow-[0_18px_46px_rgba(0,0,0,0.24)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">Отдельный диалог</p>
            <h2 className="mt-2 font-display text-[1.7rem] leading-none text-white">Чат с админом</h2>
            <p className="mt-3 max-w-[36rem] text-sm leading-6 text-white/62">
              Здесь живёт только переписка. Оплата тарифа и покупка отдельных постов теперь отправляются отдельно во вкладке оплаты.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/62">
            {chatUsage.isUnlimited
              ? "Лимит: без ограничений"
              : `Осталось ${chatUsage.remaining} из ${chatUsage.totalLimit} сообщений`}
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/10 bg-black/16 p-4">
          <MemberChatThread messages={threadMessages} />
        </div>

        <MemberChatComposer isLimitReached={isLimitReached} />

        <div className="mt-4 rounded-[22px] border border-sky-300/14 bg-sky-400/10 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-sky-50">Купить ещё сообщения</p>
              <p className="mt-1 text-xs leading-5 text-white/58">
                {CHAT_MESSAGE_PACK_SIZE} сообщений за {CHAT_MESSAGE_PACK_PRICE_EUR} EUR после проверки скрина оплаты.
              </p>
            </div>
            <a
              href="/tg/support?request=chat_messages"
              className="club-primary-action rounded-[18px] px-4 py-2 text-sm font-semibold transition hover:brightness-110"
            >
              Купить ещё сообщения
            </a>
          </div>
        </div>
      </section>
    </MiniAppShell>
  );
}
