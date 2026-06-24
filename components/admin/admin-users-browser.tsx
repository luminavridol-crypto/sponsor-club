"use client";

import { useMemo, useState } from "react";
import { deletePurchaseRequestAction, updatePurchaseRequestStatusAction } from "@/app/actions";
import {
  ADMIN_BUTTON_DANGER_CLASS,
  ADMIN_BUTTON_PRIMARY_CLASS,
  ADMIN_BUTTON_SECONDARY_CLASS,
  ADMIN_SUBPANEL_CLASS
} from "@/components/admin/theme";
import { UserCard } from "@/components/admin/user-card";
import { DonationEvent, Profile, PurchaseRequest } from "@/lib/types";

type BrowserUser = Profile & {
  donationEvents: DonationEvent[];
};

type FilterKey = "all" | "active" | "tier_4" | "tier_3" | "tier_2" | "tier_1" | "pending";

type SummaryItem = {
  key: FilterKey;
  label: string;
  value: number;
};

function chunkSummaryItems(items: SummaryItem[], size: number) {
  const rows: SummaryItem[][] = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
}

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "Все",
  active: "Участники",
  tier_4: "After Dark",
  tier_3: "VIP",
  tier_2: "Приближённые",
  tier_1: "Наблюдатели",
  pending: "Ожидают"
};

function SummaryCard({
  label,
  value,
  active,
  onClick
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full min-h-[84px] flex-col items-start justify-between rounded-[18px] border px-3 py-2.5 text-left transition ${
        active
          ? "border-white/18 bg-white/[0.08] shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
          : "border-white/10 bg-black/18 hover:border-white/16 hover:bg-white/[0.04]"
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-1.5 text-[1.05rem] font-semibold leading-none text-white">{value}</p>
    </button>
  );
}

function PendingRequestCard({ request }: { request: PurchaseRequest }) {
  const isPostRequest = Boolean(request.requested_post_id);

  return (
    <article className={ADMIN_SUBPANEL_CLASS}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[1.2rem] font-semibold text-white">
            {request.display_name || request.email || "Заявка"}
          </h3>
          <p className="mt-2 text-sm text-white/72">{request.email}</p>
          <p className="mt-1 text-sm text-white/52">{request.contact}</p>
          <p className="mt-1 text-sm text-white/42">{request.country}</p>
          <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/55">
            {isPostRequest ? "Пост" : "Подписка"}
          </div>
          {request.requested_post_title ? (
            <div className="mt-3 rounded-[18px] border border-fuchsia-300/15 bg-fuchsia-400/10 px-3 py-3 text-sm text-fuchsia-50">
              <p>
                Покупка поста: <span className="font-medium text-white">{request.requested_post_title}</span>
              </p>
              {typeof request.requested_post_price === "number" ? (
                <p className="mt-1 text-white/80">Цена: {request.requested_post_price.toFixed(2)} EUR</p>
              ) : null}
              {request.already_has_post_access ? (
                <p className="mt-2 text-white/80">
                  У пользователя уже есть доступ к этому посту по текущему тарифу.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="text-right text-sm text-white/48">
          <p>{request.status === "in_progress" ? "В работе" : "Новая"}</p>
          <p className="mt-1">{new Date(request.created_at).toLocaleString("ru-RU")}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {isPostRequest ? (
          <form action={updatePurchaseRequestStatusAction}>
            <input type="hidden" name="requestId" value={request.id} />
            <input type="hidden" name="status" value="completed" />
            <input type="hidden" name="accessMode" value="post" />
            <button className={ADMIN_BUTTON_PRIMARY_CLASS}>
              {request.already_has_post_access ? "Отметить как выданный" : "Открыть только этот пост"}
            </button>
          </form>
        ) : null}

        <form action={updatePurchaseRequestStatusAction}>
          <input type="hidden" name="requestId" value={request.id} />
          <input type="hidden" name="status" value="completed" />
          <input type="hidden" name="accessMode" value="club" />
          <button className={isPostRequest ? ADMIN_BUTTON_SECONDARY_CLASS : ADMIN_BUTTON_PRIMARY_CLASS}>
            Открыть клуб
          </button>
        </form>

        <form action={updatePurchaseRequestStatusAction}>
          <input type="hidden" name="requestId" value={request.id} />
          <input type="hidden" name="status" value="in_progress" />
          <input type="hidden" name="accessMode" value="none" />
          <button className={ADMIN_BUTTON_SECONDARY_CLASS}>В работу</button>
        </form>

        <form action={deletePurchaseRequestAction}>
          <input type="hidden" name="requestId" value={request.id} />
          <button className={ADMIN_BUTTON_DANGER_CLASS}>Удалить</button>
        </form>
      </div>
    </article>
  );
}

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h4 className="text-sm font-semibold text-white/90">{title}</h4>
      <p className="text-xs text-white/45">{count}</p>
    </div>
  );
}

export function AdminUsersBrowser({
  users,
  currentAdminId,
  requests
}: {
  users: BrowserUser[];
  currentAdminId: string;
  requests: PurchaseRequest[];
}) {
  const [selectedFilter, setSelectedFilter] = useState<FilterKey | null>(null);

  const activeUsers = useMemo(() => users.filter((user) => user.access_status === "active"), [users]);
  const pendingUsers = useMemo(() => users.filter((user) => user.access_status !== "active"), [users]);
  const postRequests = useMemo(() => requests.filter((request) => Boolean(request.requested_post_id)), [requests]);
  const subscriptionRequests = useMemo(
    () => requests.filter((request) => !request.requested_post_id),
    [requests]
  );
  const subscriptionPendingCount = pendingUsers.length + subscriptionRequests.length;

  const counts = useMemo(
    () => ({
      all: users.length,
      active: activeUsers.length,
      tier_4: activeUsers.filter((user) => user.tier === "tier_4").length,
      tier_3: activeUsers.filter((user) => user.tier === "tier_3").length,
      tier_2: activeUsers.filter((user) => user.tier === "tier_2").length,
      tier_1: activeUsers.filter((user) => user.tier === "tier_1").length,
      pending: pendingUsers.length + requests.length
    }),
    [activeUsers, pendingUsers.length, requests.length, users.length]
  );

  const summaryItems = useMemo<SummaryItem[]>(
    () => [
      { key: "all", label: "Все", value: counts.all },
      { key: "active", label: "Участники", value: counts.active },
      { key: "tier_4", label: "After Dark", value: counts.tier_4 },
      { key: "tier_3", label: "VIP", value: counts.tier_3 },
      { key: "tier_2", label: "Приближённые", value: counts.tier_2 },
      { key: "tier_1", label: "Наблюдатели", value: counts.tier_1 },
      { key: "pending", label: "Ожидают", value: counts.pending }
    ],
    [counts]
  );

  const filteredUsers = useMemo(() => {
    switch (selectedFilter) {
      case "all":
        return users;
      case "active":
        return activeUsers;
      case "tier_4":
      case "tier_3":
      case "tier_2":
      case "tier_1":
        return activeUsers.filter((user) => user.tier === selectedFilter);
      case "pending":
        return pendingUsers;
      default:
        return [];
    }
  }, [activeUsers, pendingUsers, selectedFilter, users]);

  const summaryRows = useMemo(() => chunkSummaryItems(summaryItems, 2), [summaryItems]);

  function renderUserCards(list: BrowserUser[]) {
    if (!list.length) {
      return <div className={`${ADMIN_SUBPANEL_CLASS} text-sm text-white/60`}>В этом разделе пока никого нет.</div>;
    }

    return list.map((user) => (
      <UserCard
        key={`${user.id}-${user.tier}-${user.access_expires_at ?? "none"}-${(user.admin_badges ?? []).join(",")}`}
        user={user}
        isCurrentAdmin={user.id === currentAdminId}
        donationEvents={user.donationEvents}
        hideUnlimitedButton
      />
    ));
  }

  function renderPendingContent() {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <SectionHeading title="Подписка" count={subscriptionPendingCount} />

          {pendingUsers.length ? (
            pendingUsers.map((user) => (
              <UserCard
                key={`${user.id}-${user.tier}-${user.access_expires_at ?? "none"}-${(user.admin_badges ?? []).join(",")}`}
                user={user}
                isCurrentAdmin={user.id === currentAdminId}
                donationEvents={user.donationEvents}
                hideUnlimitedButton
              />
            ))
          ) : null}

          {subscriptionRequests.length ? (
            subscriptionRequests.map((request) => <PendingRequestCard key={request.id} request={request} />)
          ) : null}

          {!subscriptionPendingCount ? (
            <div className={`${ADMIN_SUBPANEL_CLASS} text-sm text-white/60`}>Пока нет заявок по подписке.</div>
          ) : null}
        </div>

        <div className="space-y-2">
          <SectionHeading title="Пост" count={postRequests.length} />

          {postRequests.length ? (
            postRequests.map((request) => <PendingRequestCard key={request.id} request={request} />)
          ) : (
            <div className={`${ADMIN_SUBPANEL_CLASS} text-sm text-white/60`}>Пока нет заявок на покупку постов.</div>
          )}
        </div>
      </div>
    );
  }

  function renderSelectedContent() {
    if (!selectedFilter) {
      return null;
    }

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-[1.05rem] font-semibold text-white">{FILTER_LABELS[selectedFilter]}</h3>
            <p className="mt-1 text-sm text-white/45">
              {selectedFilter === "pending" ? counts.pending : filteredUsers.length}
            </p>
          </div>
          <button type="button" onClick={() => setSelectedFilter(null)} className={ADMIN_BUTTON_SECONDARY_CLASS}>
            Назад
          </button>
        </div>

        {selectedFilter === "pending" ? renderPendingContent() : renderUserCards(filteredUsers)}
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="space-y-3">
        {summaryRows.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {row.map((item) => (
                <SummaryCard
                  key={item.key}
                  label={item.label}
                  value={item.value}
                  active={selectedFilter === item.key}
                  onClick={() => setSelectedFilter((current) => (current === item.key ? null : item.key))}
                />
              ))}
              {row.length === 1 ? <div aria-hidden="true" className="min-h-[84px]" /> : null}
            </div>

            {selectedFilter && row.some((item) => item.key === selectedFilter) ? (
              <div className="rounded-[24px] border border-white/8 bg-black/10 p-1">
                {renderSelectedContent()}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
