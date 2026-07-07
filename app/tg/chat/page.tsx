export const dynamic = "force-dynamic";

import { MemberChatThread } from "@/components/chat/member-chat-thread";
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
      shellClassName="bg-[radial-gradient(circle_at_top,rgba(138,92,246,0.16),transparent_22%),radial-gradient(circle_at_82%_16%,rgba(59,130,246,0.12),transparent_20%),linear-gradient(180deg,#12131c_0%,#0e1017_48%,#090b11_100%)]"
    >
      {error ? (
        <section className="rounded-[24px] bg-rose-400/12 px-4 py-4 text-sm text-rose-100">
          {error === "limit"
            ? "Лимит сообщений на этот месяц закончился. Можно купить дополнительный пакет ниже."
            : error === "empty"
              ? "Напиши сообщение или прикрепи изображение."
              : error === "upload"
                ? "Не получилось загрузить изображение. Проверь размер и попробуй ещё раз."
                : error === "send"
                  ? "Не получилось отправить сообщение. Попробуй ещё раз."
                  : "В чат можно загрузить только изображение."}
        </section>
      ) : null}

      {sent ? (
        <section className="rounded-[24px] bg-emerald-400/12 px-4 py-4 text-sm text-emerald-100">
          Сообщение отправлено.
        </section>
      ) : null}

      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-5 py-5 text-white shadow-[0_18px_46px_rgba(0,0,0,0.24)]">
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

        <form action="/api/telegram/chat" method="post" encType="multipart/form-data" className="mt-5 space-y-3">
          <textarea
            name="body"
            rows={4}
            placeholder="Напиши сообщение админу"
            disabled={isLimitReached}
            className="w-full rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28"
          />

          <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
            <label className="flex cursor-pointer items-center justify-center rounded-[16px] border border-dashed border-white/14 px-4 py-3 text-sm text-white/60 transition hover:border-white/24 hover:text-white">
              <input type="file" name="media" accept="image/*" className="hidden" disabled={isLimitReached} />
              Прикрепить изображение
            </label>
          </div>

          <button
            disabled={isLimitReached}
            className="flex w-full items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#f0abfc,#8b5cf6_58%,#3b82f6)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(99,102,241,0.24)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isLimitReached ? "Лимит сообщений закончился" : "Отправить сообщение"}
          </button>
        </form>

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
              className="rounded-[18px] bg-sky-100 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
            >
              Купить ещё сообщения
            </a>
          </div>
        </div>
      </section>
    </MiniAppShell>
  );
}
