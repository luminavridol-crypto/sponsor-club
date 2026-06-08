export const dynamic = "force-dynamic";

import { createTelegramPurchaseRequestAction, sendMemberChatMessageAction } from "@/app/actions";
import { MessageThread } from "@/components/chat/message-thread";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { hasClubAccess } from "@/lib/auth/access";
import {
  getRecentChatMessages,
  getSignedChatMediaUrls,
  markChatReadByMember
} from "@/lib/data/chat";
import { requireAnyProfile } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupportDetails } from "@/lib/telegram/env";
import { Tier } from "@/lib/types";

const tierConfig: Record<
  Tier,
  {
    label: string;
    price: string;
    accentClass: string;
    summary: string;
  }
> = {
  tier_1: {
    label: 'Тариф "Спутник"',
    price: "10 EUR / месяц",
    accentClass: "border-slate-200/18 bg-white/[0.04]",
    summary: "Базовый вход в закрытый клуб, ранний доступ и первые эксклюзивы."
  },
  tier_2: {
    label: "Тариф Insider",
    price: "25 EUR / месяц",
    accentClass: "border-fuchsia-300/22 bg-fuchsia-400/[0.06]",
    summary: "Больше backstage, больше процесса и ближе контакт с тем, что создаётся."
  },
  tier_3: {
    label: 'Тариф "VIP"',
    price: "50 EUR / месяц",
    accentClass: "border-amber-300/24 bg-amber-300/[0.06]",
    summary: "Максимум внимания, больше персонального контента и премиальный доступ."
  },
  tier_4: {
    label: "After Dark",
    price: "80 EUR / месяц",
    accentClass: "border-violet-300/24 bg-violet-400/[0.07]",
    summary: "Самый закрытый уровень с отдельной веткой контента и особыми материалами."
  }
};

function parseTier(value: string | string[] | undefined): Tier {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized === "tier_2" || normalized === "tier_3" || normalized === "tier_4"
    ? normalized
    : "tier_1";
}

export default async function TelegramSupportPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireAnyProfile();
  const admin = createAdminSupabaseClient();
  const params = (await searchParams) ?? {};
  const selectedTier = parseTier(params.tier);
  const sent = (Array.isArray(params.sent) ? params.sent[0] : params.sent) === "1";
  const error = (Array.isArray(params.error) ? params.error[0] : params.error) === "1";
  const support = getSupportDetails();
  const tier = tierConfig[selectedTier];

  const [messages] = await Promise.all([
    getRecentChatMessages(admin, profile.id),
    markChatReadByMember(admin, profile.id)
  ]);

  const mediaMap = await getSignedChatMediaUrls(
    messages.map((message) => message.media_path).filter((value): value is string => Boolean(value))
  );

  const threadMessages = messages.map((message) => ({
    ...message,
    media_url: message.media_path ? mediaMap[message.media_path] ?? null : null
  }));

  const profileName =
    profile.display_name || profile.telegram_first_name || profile.telegram_username || "Вы";

  return (
    <MiniAppShell profile={profile} title="Оплата">
      {!hasClubAccess(profile) ? (
        <section className="rounded-[28px] border border-white/12 bg-white/[0.04] px-5 py-5 text-white shadow-[0_18px_46px_rgba(0,0,0,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">Private access</p>
          <h2 className="mt-2 font-display text-[1.6rem] leading-none text-white sm:text-[2rem]">
            Оплата и чат со мной
          </h2>
          <p className="mt-3 max-w-[34rem] text-sm leading-6 text-white/72 sm:text-[0.96rem]">
            Здесь можно открыть оплату по выбранному уровню и сразу написать мне внутри приложения, если нужно уточнить детали.
          </p>
        </section>
      ) : null}

      {sent ? (
        <section className="rounded-[28px] border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100 shadow-glow">
          Заявка по оплате отправлена. Напиши в чат ниже, если хочешь сразу уточнить детали.
        </section>
      ) : null}

      {error ? (
        <section className="rounded-[28px] border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100 shadow-glow">
          Не удалось отправить заявку. Попробуй ещё раз или напиши в чат ниже.
        </section>
      ) : null}

      <section className={`rounded-[28px] border px-5 py-5 text-white shadow-[0_18px_46px_rgba(0,0,0,0.22)] ${tier.accentClass}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Выбранный уровень</p>
            <h2 className="mt-2 font-display text-[1.6rem] leading-none text-white sm:text-[2rem]">
              {tier.label}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/72">{tier.summary}</p>
          </div>
          <div className="shrink-0 rounded-[22px] border border-white/12 bg-black/20 px-4 py-3 text-center">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Стоимость</p>
            <p className="mt-2 font-display text-[1.4rem] leading-none text-white">{tier.price}</p>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/10 bg-black/15 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Оплата</p>
          {support.cardNumber ? (
            <>
              <p className="mt-3 text-sm text-white/68">{support.cardLabel}</p>
              <p className="mt-1 break-all font-mono text-lg text-white">{support.cardNumber}</p>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-white/72">
              Реквизиты для оплаты пришлю в этом чате внутри приложения.
            </p>
          )}
          <p className="mt-3 text-sm leading-6 text-white/65">{support.note}</p>
        </div>

        <form action={createTelegramPurchaseRequestAction} className="mt-5">
          <input type="hidden" name="tier" value={selectedTier} />
          <button className="flex w-full items-center justify-center rounded-[20px] border border-white/16 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/28 hover:bg-white/14">
            Я оплатила, отправить заявку
          </button>
        </form>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Чат</p>
          <h2 className="mt-2 font-display text-[1.35rem] leading-none text-white">Связь внутри приложения</h2>
          <p className="mt-3 text-sm leading-6 text-white/68">
            Если закрыты личные сообщения в Telegram, просто напиши сюда. Я увижу сообщение в админке клуба.
          </p>
        </div>

        <MessageThread
          messages={threadMessages}
          memberLabel={profileName}
          adminLabel="Lumina"
          emptyLabel="Пока переписки нет. Напиши первое сообщение ниже."
          refreshIntervalMs={8000}
        />

        <form action={sendMemberChatMessageAction} className="mt-4 space-y-3">
          <textarea
            name="body"
            rows={4}
            placeholder="Например: хочу оплатить VIP, подскажи реквизиты или подтверди перевод."
            className="min-h-[120px] w-full rounded-[24px] border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-white/20 focus:bg-black/20"
          />
          <button className="flex w-full items-center justify-center rounded-[20px] border border-white/16 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/28 hover:bg-white/14">
            Отправить сообщение
          </button>
        </form>
      </section>
    </MiniAppShell>
  );
}
