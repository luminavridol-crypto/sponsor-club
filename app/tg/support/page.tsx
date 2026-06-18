export const dynamic = "force-dynamic";

import Link from "next/link";
import { createTelegramPurchaseRequestAction, sendMemberChatMessageAction } from "@/app/actions";
import { MessageThread } from "@/components/chat/message-thread";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { hasClubAccess } from "@/lib/auth/access";
import { requireAnyProfile } from "@/lib/auth/guards";
import { getRecentChatMessages, getSignedChatMediaUrls, markChatReadByMember } from "@/lib/data/chat";
import { getSignedAvatarUrls } from "@/lib/data/profiles";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupportDetails } from "@/lib/telegram/env";
import { Profile, Tier } from "@/lib/types";
import { formatEuroAmount } from "@/lib/utils/money";
import { normalizeProfileTier, TIER_LABELS } from "@/lib/utils/tier";
import { getTierLandingCards } from "@/lib/data/tier-landing";

const tierOrder: Tier[] = ["tier_1", "tier_2", "tier_3", "tier_4"];

function parseTier(value: string | string[] | undefined): Tier {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized === "tier_2" || normalized === "tier_3" || normalized === "tier_4"
    ? normalized
    : "tier_1";
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getProfileLabel(profile: Pick<Profile, "display_name" | "nickname" | "telegram_username" | "email">) {
  return profile.display_name || profile.nickname || profile.telegram_username || profile.email || "Участник";
}

function getTierWeight(tier: Tier) {
  return tierOrder.indexOf(tier) + 1;
}

function formatCompactDate(value: string | null) {
  if (!value) return "Без срока";

  return new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  });
}

function sortMembers(users: Profile[]) {
  return [...users].sort((a, b) => {
    const tierDiff = getTierWeight(b.tier) - getTierWeight(a.tier);
    if (tierDiff !== 0) return tierDiff;

    const accessDiff = Number(b.access_status === "active") - Number(a.access_status === "active");
    if (accessDiff !== 0) return accessDiff;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
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
  const sent = readParam(params.sent) === "1";
  const error = readParam(params.error) === "1";
  const postTitle = readParam(params.postTitle);
  const postPrice = readParam(params.postPrice);
  const mode = readParam(params.mode);
  const chatMode = mode === "chat";
  const support = getSupportDetails();

  if (profile.role === "admin") {
    const { data: profilesData } = await admin
      .from("profiles")
      .select("id, display_name, nickname, email, role, tier, access_status, avatar_url, telegram_username, access_expires_at, created_at")
      .neq("role", "admin")
      .order("created_at", { ascending: false });

    const members = sortMembers(
      (((profilesData ?? []) as Profile[]) ?? []).map((user) => normalizeProfileTier(user))
    );

    const avatarMap = await getSignedAvatarUrls(
      members.map((user) => user.avatar_url).filter((value): value is string => Boolean(value))
    );

    const membersWithAvatars = members.map((user) => ({
      ...user,
      avatar_url: user.avatar_url ? avatarMap[user.avatar_url] ?? user.avatar_url : null
    }));

    const totalCount = membersWithAvatars.length;
    const activeCount = membersWithAvatars.filter((user) => user.access_status === "active").length;
    const tierCounts = {
      tier_2: membersWithAvatars.filter((user) => user.tier === "tier_2").length,
      tier_3: membersWithAvatars.filter((user) => user.tier === "tier_3").length,
      tier_4: membersWithAvatars.filter((user) => user.tier === "tier_4").length
    };

    return (
      <MiniAppShell profile={profile} title="Пользователи">
        <section className="rounded-[28px] border border-white/12 bg-white/[0.04] px-5 py-5 text-white shadow-[0_18px_46px_rgba(0,0,0,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">Admin</p>
          <h2 className="mt-2 font-display text-[1.6rem] leading-none text-white sm:text-[2rem]">
            Список участников
          </h2>
          <p className="mt-3 max-w-[34rem] text-sm leading-6 text-white/72 sm:text-[0.96rem]">
            Здесь видны все участники клуба. Нажми на человека, чтобы открыть чат в админке.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[18px] border border-white/10 bg-black/12 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Всего</p>
              <p className="mt-1 text-xl font-semibold text-white">{totalCount}</p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-black/12 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Активные</p>
              <p className="mt-1 text-xl font-semibold text-white">{activeCount}</p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-black/12 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">VIP</p>
              <p className="mt-1 text-xl font-semibold text-white">{tierCounts.tier_3}</p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-black/12 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">After Dark</p>
              <p className="mt-1 text-xl font-semibold text-white">{tierCounts.tier_4}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/12 bg-white/[0.03] p-4 shadow-[0_18px_46px_rgba(0,0,0,0.16)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Участники</p>
              <h3 className="mt-1 font-display text-[1.2rem] leading-none text-white">Кто сейчас в клубе</h3>
            </div>
            <Link
              href="/tg/admin/users"
              className="shrink-0 rounded-2xl border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/82 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              Полный чат
            </Link>
          </div>

          <div className="mt-4 max-h-[58vh] space-y-2 overflow-y-auto pr-1">
            {membersWithAvatars.length ? (
              membersWithAvatars.map((member) => (
                <Link
                  key={member.id}
                  href={`/tg/admin/users?chat=${member.id}`}
                  className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-black/12 px-3 py-3 transition hover:border-white/18 hover:bg-white/[0.05]"
                >
                  {member.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatar_url}
                      alt={getProfileLabel(member)}
                      className="h-10 w-10 shrink-0 rounded-full border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-sm font-semibold text-white">
                      {getProfileLabel(member).slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-white">{getProfileLabel(member)}</p>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white/55">
                        {TIER_LABELS[member.tier]}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-white/45">
                      {member.telegram_username || member.email || "Без Telegram"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-white/90">
                      {member.access_status === "active" ? "Активен" : "Отключён"}
                    </p>
                    <p className="mt-1 text-[11px] text-white/42">До {formatCompactDate(member.access_expires_at)}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/10 px-3 py-4 text-sm text-white/45">
                Пока участников нет.
              </div>
            )}
          </div>
        </section>
      </MiniAppShell>
    );
  }

  const [messages, , tierCards] = await Promise.all([
    getRecentChatMessages(admin, profile.id),
    markChatReadByMember(admin, profile.id),
    getTierLandingCards().catch(() => [])
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

  const tier = tierCards.find((card) => card.tier === selectedTier) ?? tierCards[0];

  const paymentSection = (
    <>
      {!hasClubAccess(profile) ? (
        <section className="rounded-[28px] border border-white/12 bg-white/[0.04] px-5 py-5 text-white shadow-[0_18px_46px_rgba(0,0,0,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">Private access</p>
          <h2 className="mt-2 font-display text-[1.6rem] leading-none text-white sm:text-[2rem]">
            Оплата и чат со мной
          </h2>
          <p className="mt-3 max-w-[34rem] text-sm leading-6 text-white/72 sm:text-[0.96rem]">
            Здесь можно открыть оплату по выбранному уровню и сразу написать мне внутри приложения, если Telegram-личка закрыта.
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
            <h2 className="mt-2 font-display text-[1.6rem] leading-none text-white sm:text-[2rem]">{tier.label}</h2>
            <p className="mt-3 text-sm leading-6 text-white/72">{tier.teaser}</p>
          </div>
          <div className="shrink-0 rounded-[22px] border border-white/12 bg-black/20 px-4 py-3 text-center">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Стоимость</p>
            <p className="mt-2 font-display text-[1.4rem] leading-none text-white">{tier.price}</p>
          </div>
        </div>

        {postTitle ? (
          <div className="mt-4 rounded-[22px] border border-white/10 bg-black/12 px-4 py-3 text-sm text-white/72">
            Оплата для поста: <span className="font-medium text-white">{postTitle}</span>
          </div>
        ) : null}

        {postPrice ? (
          <div className="mt-3 rounded-[22px] border border-fuchsia-300/15 bg-fuchsia-400/10 px-4 py-3 text-sm text-fuchsia-50">
            Цена поста: <span className="font-medium text-white">{formatEuroAmount(postPrice) ?? postPrice}</span>
          </div>
        ) : null}

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
          {postTitle ? <input type="hidden" name="postTitle" value={postTitle} /> : null}
          {postPrice ? <input type="hidden" name="postPrice" value={postPrice} /> : null}
          <button className="flex w-full items-center justify-center rounded-[20px] border border-white/16 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/28 hover:bg-white/14">
            Я оплатила, отправить заявку
          </button>
        </form>
      </section>
    </>
  );

  const chatSection = (
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
  );

  return (
    <MiniAppShell profile={profile} title={chatMode ? "Чат" : "Оплата"}>
      {chatMode ? (
        <>
          {chatSection}
          <div className="pt-1">{paymentSection}</div>
        </>
      ) : (
        <>
          {paymentSection}
          {chatSection}
        </>
      )}
    </MiniAppShell>
  );
}
