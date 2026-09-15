import Link from "next/link";
import { AdminChatComposer } from "@/components/chat/admin-chat-composer";
import { ChatPurchasePost, MessageThread } from "@/components/chat/message-thread";
import { ADMIN_PANEL_CLASS, ADMIN_PANEL_GLOW_CLASS } from "@/components/admin/theme";
import { getRecentChatMessages, getSignedChatMediaUrls, markChatReadByAdmin } from "@/lib/data/chat";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { MemberChatMessage, Profile, PurchaseRequest } from "@/lib/types";
import { TIER_LABELS, TIERS } from "@/lib/utils/tier";

type ChatSummary = {
  profileId: string;
  label: string;
  lastAt: string | null;
  unreadCount: number;
  active: boolean;
  tier: Profile["tier"];
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
      .map((part) => [...part][0]?.toUpperCase() ?? "")
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
  selectedProfileId,
  sort
}: {
  selectedProfileId?: string;
  sort?: string;
}) {
  const selectedSort = sort === "tier_asc" || sort === "tier_desc" ? sort : "recent";
  const chatHref = (profileId?: string, nextSort = selectedSort) => {
    const params = new URLSearchParams();
    if (profileId) params.set("chat", profileId);
    if (nextSort !== "recent") params.set("sort", nextSort);
    return { pathname: "/tg/admin/chat", query: Object.fromEntries(params) };
  };
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
        active: profile?.access_status === "active",
        tier: profile?.tier ?? "tier_1"
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
          active: profile.access_status === "active",
          tier: profile.tier
        }
      );
    })
    .sort((a, b) => {
      if (selectedSort !== "recent") {
        const tierDifference = TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier);
        if (tierDifference) return selectedSort === "tier_asc" ? tierDifference : -tierDifference;
      }
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
  const purchaseMessages = threadMessages.filter(
    (message) => message.sender_role === "member" && /^Запрос на покупку поста(?::|$)/i.test(message.body ?? "")
  );
  const { data: purchaseRequestsData } = purchaseMessages.length && threadProfile?.email
    ? await admin
        .from("purchase_requests")
        .select("id, email, request_kind, requested_post_id, requested_post_slug, requested_post_title, requested_post_price, created_at")
        .eq("email", threadProfile.email)
        .eq("request_kind", "post")
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] as PurchaseRequest[] };
  const purchaseRequests = (purchaseRequestsData ?? []) as PurchaseRequest[];
  const requestedPostIds = [...new Set(purchaseRequests.map((request) => request.requested_post_id).filter((id): id is string => Boolean(id)))];
  const { data: requestedPostsData } = requestedPostIds.length
    ? await admin.from("posts").select("id, slug, title, sale_price, is_sellable").in("id", requestedPostIds)
    : { data: [] as Array<{ id: string; slug: string; title: string; sale_price: number | null; is_sellable: boolean }> };
  const requestedPosts = new Map(
    ((requestedPostsData ?? []) as Array<{ id: string; slug: string; title: string; sale_price: number | null; is_sellable: boolean }>).map((post) => [post.id, post] as const)
  );
  const purchasePostsByMessageId: Record<string, ChatPurchasePost> = {};
  for (const message of purchaseMessages) {
    const messageTitle = (message.body ?? "").replace(/^Запрос на покупку поста:\s*/i, "").trim();
    const messageTime = new Date(message.created_at).getTime();
    const matches = purchaseRequests.filter((request) => {
      const requestTime = new Date(request.created_at).getTime();
      const requestedTitle = request.requested_post_title ?? (request.requested_post_id ? requestedPosts.get(request.requested_post_id)?.title : null);
      return Math.abs(requestTime - messageTime) <= 2 * 60 * 1000 && (!messageTitle || requestedTitle === messageTitle);
    });
    // Don't attach a different post when several same-titled requests overlap in time.
    if (new Set(matches.map((request) => request.requested_post_id ?? request.requested_post_slug)).size > 1) continue;
    const request = matches.sort((a, b) =>
      Math.abs(new Date(a.created_at).getTime() - messageTime) - Math.abs(new Date(b.created_at).getTime() - messageTime)
    )[0];
    if (!request) continue;
    const post = request.requested_post_id ? requestedPosts.get(request.requested_post_id) : null;
    purchasePostsByMessageId[message.id] = {
      id: post?.id ?? request.requested_post_id ?? null,
      slug: post?.slug ?? (request.requested_post_id ? null : request.requested_post_slug ?? null),
      title: post?.title ?? request.requested_post_title ?? messageTitle,
      price: typeof post?.sale_price === "number" ? post.sale_price : null,
      requestedPrice: request.requested_post_price ?? null,
      isSellable: post?.is_sellable ?? null
    };
  }
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
  const summaryGroups = [
    {
      key: "active",
      title: "Активные участники",
      emptyLabel: "Пока нет активных участников.",
      summaries: summariesWithReadState.filter((summary) => summary.active)
    },
    {
      key: "inactive",
      title: "Неактивные участники",
      emptyLabel: "Пока нет неактивных участников.",
      summaries: summariesWithReadState.filter((summary) => !summary.active)
    }
  ] as const;

  return (
    <section className={ADMIN_PANEL_CLASS}>
      <div className={ADMIN_PANEL_GLOW_CLASS} />
      <div className="relative">
        <div
          className={
            activeProfileId
              ? "grid gap-3 xl:grid-cols-[minmax(520px,0.9fr)_minmax(0,1.1fr)]"
              : "grid gap-3"
          }
        >
          <aside className={`rounded-[24px] border border-white/8 bg-[#17141e]/95 ${activeProfileId ? "order-2 xl:order-1" : ""}`}>
            <div className="relative z-10 flex justify-end px-3 py-2.5 sm:px-4">
              <details key={selectedSort} className="group relative text-xs text-white/55">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-2.5 py-1.5 transition hover:bg-white/[0.04] hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60 [&::-webkit-details-marker]:hidden">
                  <span>Сортировка: {selectedSort === "tier_desc" ? "Тариф: высокий → низкий" : selectedSort === "tier_asc" ? "Тариф: низкий → высокий" : "Новые чаты"}</span>
                  <span aria-hidden="true" className="text-white/35 transition group-open:rotate-180">⌄</span>
                </summary>
                <div className="absolute right-0 top-full mt-1 w-max max-w-[calc(100vw-3rem)] rounded-xl border border-white/10 bg-[#24202d] p-1 shadow-[0_16px_30px_rgba(0,0,0,0.35)]">
                  {([ ["recent", "Новые чаты"], ["tier_desc", "Тариф: высокий → низкий"], ["tier_asc", "Тариф: низкий → высокий"] ] as const).map(([value, label]) => (
                    <Link key={value} href={chatHref(activeProfileId ?? undefined, value)} aria-label={label} aria-current={selectedSort === value ? "page" : undefined} className={`block rounded-lg px-3 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60 ${selectedSort === value ? "bg-violet-300/10 text-white" : "hover:bg-white/[0.06] hover:text-white"}`}>
                      {label}
                    </Link>
                  ))}
                </div>
              </details>
            </div>
            <div className="grid gap-1.5 md:grid-cols-2 md:gap-2">
              {summaryGroups.map((group) => (
                <section
                  key={group.key}
                  className={`min-w-0 ${
                    group.key === "active" ? "bg-white/[0.015]" : "border-t border-white/6 bg-black/10 md:border-t-0"
                  }`}
                >
                  <div className="flex items-center gap-2 px-3.5 pb-1 pt-3 sm:px-4">
                    <h2 className={`font-display text-[1.08rem] font-semibold ${group.key === "active" ? "text-white" : "text-white/75"}`}>{group.title}</h2>
                    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/50">
                      {group.summaries.length}
                    </span>
                  </div>

                  <div className="space-y-1 px-2.5 pb-3 pt-1 sm:px-3">
                    {group.summaries.length ? (
                      group.summaries.map((summary) => (
                        <Link
                          key={summary.profileId}
                          href={chatHref(summary.profileId === activeProfileId ? undefined : summary.profileId)}
                          className={`group/card flex min-h-[62px] cursor-pointer items-center gap-2.5 rounded-[16px] border border-transparent px-2.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60 ${
                            summary.profileId === activeProfileId
                              ? "border-violet-300/18 bg-violet-300/[0.08]"
                              : summary.unreadCount
                                ? "bg-cyanGlow/[0.08] hover:border-cyanGlow/15 hover:bg-cyanGlow/[0.11]"
                                : group.key === "active"
                                  ? "bg-white/[0.045] hover:border-white/8 hover:bg-white/[0.075]"
                                  : "bg-white/[0.025] hover:border-white/7 hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold ${group.key === "active" ? "text-white" : "text-white/70"}`}>
                            {getInitials(summary.label)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-[13px] font-semibold leading-[1.3] ${group.key === "active" ? "text-white" : "text-white/82"}`} title={summary.label}>{summary.label}</p>
                            <p className={`mt-0.5 truncate text-[11px] leading-[1.25] ${group.key === "active" ? "text-white/60" : "text-white/48"}`}>{TIER_LABELS[summary.tier]}</p>
                            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] leading-[1.25] text-white/38">
                              <span className="truncate">
                                {summary.profileId === activeProfileId
                                  ? "Свернуть чат"
                                  : summary.lastAt
                                    ? "Открыть диалог"
                                    : "Без сообщений"}
                              </span>
                              {summary.lastAt ? <span className="shrink-0 text-white/30">· {formatThreadTime(summary.lastAt)}</span> : null}
                              {summary.unreadCount ? (
                                <span className="ml-auto inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-cyanGlow px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">
                                  {summary.unreadCount}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-5 text-sm text-white/45">
                        {group.emptyLabel}
                      </div>
                    )}
                  </div>
                </section>
              ))}
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
                    href={chatHref()}
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
                    purchasePostsByMessageId={purchasePostsByMessageId}
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
