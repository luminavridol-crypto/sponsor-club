export const dynamic = "force-dynamic";

import { PrivateShell } from "@/components/layout/private-shell";
import {
  deleteAllPurchaseRequestsAction,
  updatePurchaseRequestStatusAction
} from "@/app/actions";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PurchaseRequest, Tier } from "@/lib/types";

const TIER_LABELS: Record<Tier, string> = {
  tier_1: "Наблюдатель",
  tier_2: "Приближённый",
  tier_3: "VIP"
};

const STATUS_LABELS = {
  new: "Новая",
  in_progress: "В работе",
  completed: "Завершена"
} as const;

function statusTone(status: PurchaseRequest["status"]) {
  if (status === "completed") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "in_progress") {
    return "border-cyanGlow/30 bg-cyanGlow/10 text-cyanGlow";
  }

  return "border-accent/30 bg-accent/10 text-accentSoft";
}

export default async function AdminPurchaseRequestsPage() {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();

  const { data } = await admin
    .from("purchase_requests")
    .select("*")
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as PurchaseRequest[];

  return (
    <PrivateShell profile={profile} admin>
      <div className="space-y-4">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-glow sm:rounded-[32px] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">Purchase Requests</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Заявки на покупку</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60 sm:leading-7">
                Здесь появляются все запросы с главной страницы. Можно быстро увидеть tier, почту,
                страну и контакт, а потом отметить заявку как обработанную.
              </p>
            </div>

            {requests.length ? (
              <ConfirmActionForm
                action={deleteAllPurchaseRequestsAction}
                confirmMessage="Точно удалить все заявки? Это действие нельзя отменить."
                buttonLabel="Очистить всё"
                buttonClassName="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-5 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20"
              />
            ) : null}
          </div>
        </section>

        {requests.length === 0 ? (
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 text-white/60 sm:rounded-[32px] sm:p-6">
            Пока заявок нет.
          </section>
        ) : (
          requests.map((request) => (
            <section
              key={request.id}
              className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-glow sm:rounded-[32px] sm:p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/48">
                      {TIER_LABELS[request.tier]}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-sm ${statusTone(request.status)}`}>
                      {STATUS_LABELS[request.status]}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <InfoCard label="Email" value={request.email} />
                    <InfoCard label="Страна" value={request.country} />
                    <InfoCard label="Контакт" value={request.contact} />
                    <InfoCard
                      label="Дата"
                      value={new Date(request.created_at).toLocaleString("ru-RU")}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:w-[220px] lg:flex-col">
                  <form action={updatePurchaseRequestStatusAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="status" value="in_progress" />
                    <button className="w-full rounded-2xl border border-cyanGlow/30 bg-cyanGlow/10 px-4 py-3 text-sm text-cyanGlow transition hover:bg-cyanGlow/20">
                      Отметить: в работе
                    </button>
                  </form>
                  <form action={updatePurchaseRequestStatusAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="status" value="completed" />
                    <button className="w-full rounded-2xl border border-accent/35 bg-accent/10 px-4 py-3 text-sm text-accentSoft transition hover:bg-accent/20">
                      Отметить: завершена
                    </button>
                  </form>
                </div>
              </div>
            </section>
          ))
        )}
      </div>
    </PrivateShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-white/38">{label}</p>
      <p className="mt-2 break-words text-sm text-white sm:text-base">{value}</p>
    </div>
  );
}
