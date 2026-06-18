"use client";

import { useMemo, useState } from "react";
import {
  ADMIN_BUTTON_SECONDARY_CLASS,
  ADMIN_SUBPANEL_CLASS
} from "@/components/admin/theme";
import { UserCard } from "@/components/admin/user-card";
import { DonationEvent, Profile, PurchaseRequest } from "@/lib/types";

type BrowserUser = Profile & {
  donationEvents: DonationEvent[];
};

type FilterKey =
  | "all"
  | "active"
  | "tier_4"
  | "tier_3"
  | "tier_2"
  | "tier_1"
  | "pending";

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
      className={`flex min-h-[96px] flex-col items-start justify-between rounded-[22px] border px-4 py-4 text-left transition ${
        active
          ? "border-white/18 bg-white/[0.08] shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
          : "border-white/10 bg-black/18 hover:border-white/16 hover:bg-white/[0.04]"
      }`}
    >
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className="mt-3 text-[1.5rem] font-semibold leading-none text-white">{value}</p>
    </button>
  );
}

function PendingRequestCard({
  request
}: {
  request: PurchaseRequest;
}) {
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
        </div>
        <div className="text-right text-sm text-white/48">
          <p>{request.status === "in_progress" ? "В работе" : "Новая"}</p>
          <p className="mt-1">{new Date(request.created_at).toLocaleString("ru-RU")}</p>
        </div>
      </div>
    </article>
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

  const activeUsers = useMemo(
    () => users.filter((user) => user.access_status === "active"),
    [users]
  );
  const counts = useMemo(
    () => ({
      all: users.length,
      active: activeUsers.length,
      tier_4: activeUsers.filter((user) => user.tier === "tier_4").length,
      tier_3: activeUsers.filter((user) => user.tier === "tier_3").length,
      tier_2: activeUsers.filter((user) => user.tier === "tier_2").length,
      tier_1: activeUsers.filter((user) => user.tier === "tier_1").length,
      pending: requests.length
    }),
    [activeUsers, requests.length, users.length]
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
      default:
        return [];
    }
  }, [activeUsers, selectedFilter, users]);

  return (
    <section className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Все" value={counts.all} active={selectedFilter === "all"} onClick={() => setSelectedFilter("all")} />
        <SummaryCard
          label="Участники"
          value={counts.active}
          active={selectedFilter === "active"}
          onClick={() => setSelectedFilter("active")}
        />
        <SummaryCard
          label="After Dark"
          value={counts.tier_4}
          active={selectedFilter === "tier_4"}
          onClick={() => setSelectedFilter("tier_4")}
        />
        <SummaryCard label="VIP" value={counts.tier_3} active={selectedFilter === "tier_3"} onClick={() => setSelectedFilter("tier_3")} />
        <SummaryCard
          label="Приближённые"
          value={counts.tier_2}
          active={selectedFilter === "tier_2"}
          onClick={() => setSelectedFilter("tier_2")}
        />
        <SummaryCard
          label="Наблюдатели"
          value={counts.tier_1}
          active={selectedFilter === "tier_1"}
          onClick={() => setSelectedFilter("tier_1")}
        />
        <SummaryCard
          label="Ожидают"
          value={counts.pending}
          active={selectedFilter === "pending"}
          onClick={() => setSelectedFilter("pending")}
        />
      </div>

      {selectedFilter ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-[1.35rem] font-semibold text-white">{FILTER_LABELS[selectedFilter]}</h3>
              <p className="mt-1 text-sm text-white/45">
                {selectedFilter === "pending" ? counts.pending : filteredUsers.length}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFilter(null)}
              className={ADMIN_BUTTON_SECONDARY_CLASS}
            >
              Назад
            </button>
          </div>

          {selectedFilter === "pending" ? (
            requests.length ? (
              requests.map((request) => <PendingRequestCard key={request.id} request={request} />)
            ) : (
              <div className={`${ADMIN_SUBPANEL_CLASS} text-sm text-white/60`}>Заявок пока нет.</div>
            )
          ) : filteredUsers.length ? (
            filteredUsers.map((user) => (
              <UserCard
                key={`${user.id}-${user.tier}-${user.access_expires_at ?? "none"}-${(user.admin_badges ?? []).join(",")}`}
                user={user}
                isCurrentAdmin={user.id === currentAdminId}
                donationEvents={user.donationEvents}
                hideUnlimitedButton
              />
            ))
          ) : (
            <div className={`${ADMIN_SUBPANEL_CLASS} text-sm text-white/60`}>В этом разделе пока никого нет.</div>
          )}
        </div>
      ) : null}
    </section>
  );
}
