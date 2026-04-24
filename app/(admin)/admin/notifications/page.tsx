export const dynamic = "force-dynamic";

import Link from "next/link";
import { Route } from "next";
import { ReactNode } from "react";
import { PrivateShell } from "@/components/layout/private-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { getAdminUnreadPostComments } from "@/lib/data/comments";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function formatDate(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function AdminNotificationsPage() {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();
  const now = new Date();
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    unreadComments,
    { data: unreadChat },
    { data: requests },
    { data: expiringUsers }
  ] = await Promise.all([
    getAdminUnreadPostComments(profile.last_content_seen_at),
    admin
      .from("member_chat_messages")
      .select("id, profile_id, body, created_at, profiles(display_name, nickname, email)")
      .eq("sender_role", "member")
      .is("read_by_admin_at", null)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("purchase_requests")
      .select("*")
      .in("status", ["new", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("profiles")
      .select("id, display_name, nickname, email, access_expires_at, tier")
      .eq("role", "member")
      .eq("access_status", "active")
      .not("access_expires_at", "is", null)
      .gt("access_expires_at", now.toISOString())
      .lte("access_expires_at", sevenDaysFromNow)
      .order("access_expires_at", { ascending: true })
      .limit(10)
  ]);

  const total =
    unreadComments.length +
    (unreadChat?.length ?? 0) +
    (requests?.length ?? 0) +
    (expiringUsers?.length ?? 0);

  return (
    <PrivateShell profile={profile} admin>
      <section className="space-y-5">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">Notifications</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Центр уведомлений</h2>
          <p className="mt-3 text-sm leading-7 text-white/62">
            {total ? `${total} событий требуют внимания.` : "Новых событий пока нет."}
          </p>
        </div>

        <NotificationSection title="Комментарии" count={unreadComments.length}>
          {unreadComments.map((comment) => (
            <NotificationCard
              key={comment.id}
              title={comment.posts?.title ?? "Пост"}
              meta={`${comment.profiles?.display_name || comment.profiles?.nickname || comment.profiles?.email || "Участник"} • ${formatDate(comment.created_at)}`}
              text={comment.body}
              href={comment.posts?.slug ? `/feed/${comment.posts.slug}#comments` : "/feed"}
              action="Открыть"
            />
          ))}
        </NotificationSection>

        <NotificationSection title="Чат" count={unreadChat?.length ?? 0}>
          {(unreadChat ?? []).map((message) => {
            const author = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
            return (
              <NotificationCard
                key={message.id}
                title={author?.display_name || author?.nickname || author?.email || "Участник"}
                meta={formatDate(message.created_at)}
                text={message.body || "Медиа-сообщение"}
                href="/admin/chat"
                action="Открыть чат"
              />
            );
          })}
        </NotificationSection>

        <NotificationSection title="Заявки" count={requests?.length ?? 0}>
          {(requests ?? []).map((request) => (
            <NotificationCard
              key={request.id}
              title={request.display_name || request.email}
              meta={`${request.tier} • ${formatDate(request.created_at)}`}
              text={`${request.country} • ${request.contact}`}
              href="/admin/requests"
              action="К заявкам"
            />
          ))}
        </NotificationSection>

        <NotificationSection title="Доступ скоро закончится" count={expiringUsers?.length ?? 0}>
          {(expiringUsers ?? []).map((user) => (
            <NotificationCard
              key={user.id}
              title={user.display_name || user.nickname || user.email}
              meta={`${user.tier} • до ${formatDate(user.access_expires_at)}`}
              text={user.email}
              href="/admin/users"
              action="Открыть пользователей"
            />
          ))}
        </NotificationSection>
      </section>
    </PrivateShell>
  );
}

function NotificationSection({
  title,
  count,
  children
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-2xl font-semibold text-white">{title}</h3>
        <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm text-accentSoft">
          {count}
        </span>
      </div>
      <div className="grid gap-3">
        {count ? children : <p className="text-sm text-white/45">Ничего нового.</p>}
      </div>
    </section>
  );
}

function NotificationCard({
  title,
  meta,
  text,
  href,
  action
}: {
  title: string;
  meta: string;
  text: string;
  href: string;
  action: string;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-black/15 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-white/45">{meta}</p>
          <h4 className="mt-1 break-words text-lg font-semibold text-white">{title}</h4>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/65">{text}</p>
        </div>
        <Link
          href={href as Route}
          className="shrink-0 rounded-2xl bg-white px-4 py-2 text-center text-sm font-medium text-background transition hover:bg-goldSoft"
        >
          {action}
        </Link>
      </div>
    </article>
  );
}
