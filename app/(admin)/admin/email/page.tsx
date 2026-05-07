export const dynamic = "force-dynamic";

import {
  savePostEmailTemplateAction,
  sendAccessExpiryEmailsNowAction,
  sendManualSponsorEmailAction,
  sendPostEmailCampaignAction,
  updateAccessExpiryEmailSettingsAction
} from "@/app/actions";
import { PrivateShell } from "@/components/layout/private-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { getAccessExpiryEmailSettings } from "@/lib/email/access-reminders";
import { getEmailConfig, hasSmtpTransport } from "@/lib/email/config";
import { readEmailLocalState } from "@/lib/email/local-store";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { TIER_LABELS } from "@/lib/utils/tier";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function audienceLabel(value: string) {
  switch (value) {
    case "all_active":
      return "Все активные спонсоры";
    case "tier_1":
      return "Tier 1";
    case "tier_2":
      return "Tier 2";
    case "tier_3":
      return "VIP";
    case "expiring_soon":
      return "Тариф заканчивается скоро";
    case "eligible_post_members":
      return "Только те, кому доступен пост";
    default:
      return value;
  }
}

function statusTone(status: string) {
  if (status === "sent" || status === "logged") {
    return "text-cyanGlow";
  }

  if (status === "failed") {
    return "text-rose-200";
  }

  return "text-white/70";
}

export default async function AdminEmailPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();
  const params = (await searchParams) ?? {};
  const selectedPostId =
    typeof params.post === "string" && params.post.length > 0 ? params.post : "";

  const settings = await getAccessExpiryEmailSettings();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const emailConfig = getEmailConfig();
  const emailState = await readEmailLocalState();
  const nowIso = new Date().toISOString();
  const weekFromNowIso = new Date(new Date(nowIso).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: posts },
    { data: expiringMembers }
  ] = await Promise.all([
    admin
      .from("posts")
      .select("id, title, slug, description, required_tier, status, publish_at")
      .eq("status", "published")
      .order("publish_at", { ascending: false })
      .limit(20),
    admin
      .from("profiles")
      .select("id, display_name, nickname, email, tier, access_expires_at")
      .eq("role", "member")
      .eq("access_status", "active")
      .not("access_expires_at", "is", null)
      .gt("access_expires_at", nowIso)
      .lte("access_expires_at", weekFromNowIso)
      .order("access_expires_at", { ascending: true })
      .limit(8)
  ]);

  const campaigns = emailState.campaigns.slice(0, 8);
  const deliveries = emailState.deliveries;

  const selectedPost =
    (posts ?? []).find((post) => post.id === selectedPostId) ?? posts?.[0] ?? null;
  const savedPostTemplate = selectedPost ? emailState.postTemplates[selectedPost.id] : null;

  const defaultPostSubject = savedPostTemplate?.subject
    ?? (selectedPost ? `Новый пост в Lumina: ${selectedPost.title}` : "Новый пост в Lumina");
  const defaultPostBody = savedPostTemplate?.body
    ?? (selectedPost
    ? `Привет, {{name}}!\n\nВ клубе вышел новый пост: ${selectedPost.title}.\n${
        selectedPost.description ? `${selectedPost.description}\n\n` : "\n"
      }Открыть пост: ${siteUrl}/club/${selectedPost.slug}\n\nДо встречи внутри клуба.`
    : "Привет, {{name}}!\n\nВ клубе появился новый материал.\n\nОткрыть клуб: {{club_url}}");

  const defaultManualBody =
    "Привет, {{name}}!\n\nЭто письмо для спонсоров Lumina.\n\nЗдесь можно написать любой анонс, новость или важное сообщение.\n\nВойти в клуб: {{club_url}}";

  const infoMessage =
    typeof params.sent === "string"
      ? `Готово: ${params.sent} писем отправлено${typeof params.failed === "string" && Number(params.failed) > 0 ? `, ошибок: ${params.failed}` : ""}.`
      : typeof params.saved === "string"
        ? "Настройки рассылки сохранены."
        : typeof params.savedTemplate === "string"
          ? "Шаблон письма по посту сохранён."
        : typeof params.error === "string"
          ? "Не удалось выполнить действие. Проверьте поля и попробуйте ещё раз."
          : "";

  return (
    <PrivateShell profile={profile} admin>
      <section className="space-y-5">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">Email Control</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Email-рассылки клуба</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
            Здесь можно отправлять письма по выбранным постам, делать отдельную рассылку для спонсоров и держать
            автоматические напоминания по тарифу включёнными.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-cyanGlow">Режим отправки</p>
            <h3 className="mt-3 text-xl font-semibold text-white">
              {hasSmtpTransport() ? "SMTP подключён" : "Локальный лог"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/60">
              {hasSmtpTransport()
                ? `Письма уходят через ${emailConfig.host}:${emailConfig.port}.`
                : `Письма пока складываются в ${emailConfig.outboxDir}. Это удобно для локальной проверки.`}
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-cyanGlow">Авто-напоминания</p>
            <h3 className="mt-3 text-xl font-semibold text-white">{settings.enabled ? "Включены" : "Выключены"}</h3>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Сейчас письма отправляются за {settings.daysBefore.join(", ")} дн. до окончания доступа.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-cyanGlow">Скоро закончится</p>
            <h3 className="mt-3 text-xl font-semibold text-white">{expiringMembers?.length ?? 0} участников</h3>
            <p className="mt-2 text-sm leading-6 text-white/60">
              В превью ниже показаны ближайшие продления на 7 дней вперёд.
            </p>
          </div>
        </div>

        {infoMessage ? (
          <div className="rounded-[24px] border border-accent/30 bg-accent/10 px-5 py-4 text-sm text-white/85">
            {infoMessage}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-accentSoft">Post Campaign</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Рассылка по выбранному посту</h3>
            <form action={sendPostEmailCampaignAction} className="mt-5 grid gap-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <select name="postId" defaultValue={selectedPost?.id ?? ""}>
                  {(posts ?? []).map((post) => (
                    <option key={post.id} value={post.id}>
                      {post.title} • {TIER_LABELS[post.required_tier as keyof typeof TIER_LABELS]}
                    </option>
                  ))}
                </select>
                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white/65">
                  Получат письмо только те, кому доступен этот пост.
                </div>
              </div>
              <input name="subject" defaultValue={defaultPostSubject} placeholder="Тема письма" />
              <textarea
                name="body"
                defaultValue={defaultPostBody}
                placeholder="Текст письма. Можно использовать {{name}}, {{club_url}}."
                className="min-h-[220px]"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  formAction={savePostEmailTemplateAction}
                  className="w-full rounded-2xl border border-cyanGlow/35 bg-cyanGlow/15 px-5 py-3 text-sm font-medium text-cyanGlow transition hover:bg-cyanGlow/25 sm:w-fit"
                >
                  Сохранить шаблон
                </button>
                <button className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-medium text-background transition hover:bg-goldSoft sm:w-fit">
                  Отправить письмо по посту
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-accentSoft">Manual Campaign</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Ручная рассылка для спонсоров</h3>
            <form action={sendManualSponsorEmailAction} className="mt-5 grid gap-4">
              <select name="audience" defaultValue="all_active">
                <option value="all_active">Все активные спонсоры</option>
                <option value="tier_1">Только Tier 1</option>
                <option value="tier_2">Только Tier 2</option>
                <option value="tier_3">Только VIP</option>
                <option value="expiring_soon">Только тем, у кого скоро закончится тариф</option>
              </select>
              <input name="subject" defaultValue="Новости клуба Lumina" placeholder="Тема письма" />
              <textarea
                name="body"
                defaultValue={defaultManualBody}
                placeholder="Текст письма. Можно использовать {{name}}, {{tier}}, {{club_url}}."
                className="min-h-[220px]"
              />
              <button className="w-full rounded-2xl border border-cyanGlow/35 bg-cyanGlow/15 px-5 py-3 text-sm font-medium text-cyanGlow transition hover:bg-cyanGlow/25 sm:w-fit">
                Отправить ручную рассылку
              </button>
            </form>
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-accentSoft">Access Reminder</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Автоматические письма по тарифу</h3>
            <form action={updateAccessExpiryEmailSettingsAction} className="mt-5 grid gap-4">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white/85">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={settings.enabled}
                  className="h-4 w-4 rounded border-white/20 bg-transparent p-0"
                />
                <span>Автоматически отправлять напоминания о скором окончании доступа</span>
              </label>
              <input
                name="daysBefore"
                defaultValue={settings.daysBefore.join(", ")}
                placeholder="Например: 7, 3, 1"
              />
              <input name="subject" defaultValue={settings.subject} placeholder="Тема письма" />
              <textarea
                name="body"
                defaultValue={settings.body}
                placeholder="Можно использовать {{name}}, {{days_left}}, {{expires_at}}, {{club_url}}."
                className="min-h-[220px]"
              />
              <div className="flex flex-wrap gap-3">
                <button className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-background transition hover:bg-goldSoft">
                  Сохранить настройки
                </button>
              </div>
            </form>

            <form action={sendAccessExpiryEmailsNowAction} className="mt-4">
              <button className="rounded-2xl border border-accent/35 bg-accent/15 px-5 py-3 text-sm font-medium text-accentSoft transition hover:bg-accent/25">
                Отправить напоминания сейчас
              </button>
            </form>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-cyanGlow">Preview</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Кто скоро получит письмо</h3>
            <div className="mt-4 space-y-3">
              {(expiringMembers ?? []).length ? (
                expiringMembers!.map((member) => (
                  <article key={member.id} className="rounded-3xl border border-white/10 bg-black/10 p-4">
                    <p className="text-sm text-white/45">{member.email}</p>
                    <h4 className="mt-1 text-lg font-semibold text-white">
                      {member.display_name || member.nickname || member.email}
                    </h4>
                    <p className="mt-2 text-sm text-white/65">
                      {TIER_LABELS[member.tier as keyof typeof TIER_LABELS]} • до {formatDate(member.access_expires_at)}
                    </p>
                  </article>
                ))
              ) : (
                <div className="rounded-3xl border border-white/10 bg-black/10 p-4 text-sm text-white/55">
                  На ближайшие 7 дней никого нет.
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-accentSoft">Recent Activity</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Последние рассылки</h3>
          <div className="mt-4 grid gap-3">
            {(campaigns ?? []).length ? (
              campaigns!.map((campaign) => {
                const campaignDeliveries = deliveries.filter((item) => item.campaignId === campaign.id);
                const sentCount = campaignDeliveries.filter((item) => item.status === "sent" || item.status === "logged").length;
                const failedCount = campaignDeliveries.filter((item) => item.status === "failed").length;

                return (
                  <article key={campaign.id} className="rounded-3xl border border-white/10 bg-black/10 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm text-white/45">
                          {campaign.kind} • {audienceLabel(campaign.targetScope)}
                        </p>
                        <h4 className="mt-1 text-lg font-semibold text-white">{campaign.title}</h4>
                        <p className="mt-2 line-clamp-2 text-sm text-white/65">{campaign.subject}</p>
                      </div>
                      <div className="shrink-0 text-sm text-white/55">
                        <p>{formatDate(campaign.sentAt || campaign.createdAt)}</p>
                        <p className={`mt-2 ${statusTone(failedCount ? "failed" : "sent")}`}>
                          {sentCount} доставлено • {failedCount} ошибок
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-3xl border border-white/10 bg-black/10 p-4 text-sm text-white/55">
                Рассылок пока не было.
              </div>
            )}
          </div>
        </section>
      </section>
    </PrivateShell>
  );
}
