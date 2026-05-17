"use server";

import { randomUUID } from "crypto";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireAnyProfile, requireProfile } from "@/lib/auth/guards";
import { hasClubAccess } from "@/lib/auth/access";
import { cleanupOldChatMessages } from "@/lib/data/chat";
import { reactionOptions } from "@/lib/data/reactions";
import { cleanupOrphanedStorage, getOrphanedStorageReport } from "@/lib/data/storage-cleanup";
import {
  runAutomaticAccessExpiryReminders,
  updateAccessExpiryEmailSettings
} from "@/lib/email/access-reminders";
import { savePostEmailTemplate } from "@/lib/email/local-store";
import { getManualEmailRecipients, getPostEmailRecipients, ManualEmailAudience } from "@/lib/email/recipients";
import { sendEmailCampaign } from "@/lib/email/service";
import { deleteR2Objects, isR2StoragePath } from "@/lib/r2/server";
import {
  assertUploadFile,
  getSafeFileExtension,
  getUploadMediaType
} from "@/lib/security/file-uploads";
import { deleteMedia, uploadMediaToR2 } from "@/lib/storage/media";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getTelegramProfileFromSession } from "@/lib/telegram/auth";
import { clearTelegramSession } from "@/lib/telegram/session";
import { AccessStatus, DonationClaimStatus, PostReactionType, PostStatus, PostType, Tier } from "@/lib/types";
import { canAccessTier } from "@/lib/utils/tier";
import { buildContentSlug } from "@/lib/utils/content-space";

export type CleanupCheckState = {
  status: "idle" | "success" | "error";
  message: string;
  fileCount: number;
  totalBytes: number;
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  next: z.string().optional()
});

const inviteSchema = z.object({
  code: z.string().min(4),
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional()
});

const passwordResetRequestSchema = z.object({
  email: z.string().email()
});

const passwordUpdateSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string().min(8)
});

const purchaseRequestSchema = z.object({
  tier: z.enum(["tier_1", "tier_2", "tier_3"]),
  displayName: z.string().min(2).max(80),
  email: z.string().email().max(120),
  country: z.string().min(2).max(80),
  contactMethod: z.enum(["Telegram", "Instagram", "Email", "Other"]),
  contactHandle: z.string().min(2).max(160),
  website: z.string().max(0)
});

const donationClaimSchema = z.object({
  tier: z.enum(["tier_1", "tier_2", "tier_3"]),
  amount: z.number().min(0).max(100000).optional(),
  note: z.string().trim().min(2).max(1000)
});

const postEmailCampaignSchema = z.object({
  postId: z.string().uuid(),
  subject: z.string().trim().min(3).max(180),
  body: z.string().trim().min(10).max(20000)
});

const manualEmailCampaignSchema = z.object({
  audience: z.enum(["all_active", "tier_1", "tier_2", "tier_3", "expiring_soon"]),
  subject: z.string().trim().min(3).max(180),
  body: z.string().trim().min(10).max(20000)
});

const accessExpiryEmailSettingsSchema = z.object({
  enabled: z.boolean(),
  daysBefore: z.array(z.number().int().positive()).min(1),
  subject: z.string().trim().min(3).max(180),
  body: z.string().trim().min(10).max(20000)
});

const commentSchema = z.object({
  postId: z.string().uuid(),
  postSlug: z.string().min(1),
  body: z.string().trim().min(1).max(1000)
});

const postReactionSchema = z.object({
  postId: z.string().uuid(),
  postSlug: z.string().min(1),
  reaction: z.enum(reactionOptions.map((item) => item.key) as [PostReactionType, ...PostReactionType[]])
});

const commentReactionSchema = z.object({
  commentId: z.string().uuid(),
  postSlug: z.string().min(1),
  reaction: z.enum(reactionOptions.map((item) => item.key) as [PostReactionType, ...PostReactionType[]])
});

function formValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return 0;
  }

  const normalized = value.trim().replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDaysBefore(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function currentDonationPeriod() {
  const now = new Date();

  return {
    donationYear: now.getUTCFullYear(),
    donationMonth: now.getUTCMonth() + 1
  };
}

async function getOldPostIds(admin = createAdminSupabaseClient()) {
  const nowIso = new Date().toISOString();
  const { data } = await admin
    .from("posts")
    .select("id")
    .or(`status.eq.draft,and(expires_at.not.is.null,expires_at.lt.${nowIso})`);

  return (data ?? []).map((post) => post.id);
}

async function getSiteUrl() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const protocol =
    forwardedProto ?? (host?.includes("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");

  if (host) {
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function getSafeNextPath(value: string | undefined, fallback: Route = "/dashboard") {
  if (!value) {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value as Route;
}

function redirectToAdminEmail(params: Record<string, string | number>): never {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, String(value));
  }

  return redirect(`/admin/email?${searchParams.toString()}`);
}

// Kept as a ready-to-reuse mapper for storage provider errors in admin flows.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function humanizeStorageError(message: string) {
  if (message.includes("The object exceeded the maximum allowed size")) {
    return "Файл слишком большой для текущего лимита в Supabase Storage. Увеличь лимит нужного bucket.";
  }

  if (message.includes("Bucket not found")) {
    return "Нужный bucket не найден в Supabase Storage.";
  }

  return message;
}

function revalidatePostSpace(postSlug: string) {
  revalidatePath("/feed");
  revalidatePath(`/feed/${postSlug}`);
  revalidatePath("/club");
  revalidatePath(`/club/${postSlug}`);
  revalidatePath("/tg/content");
  revalidatePath(`/tg/content/${postSlug}`);
}

function addDays(base: string | null, days: number) {
  const now = new Date();
  const start = base && new Date(base) > now ? new Date(base) : now;
  start.setDate(start.getDate() + days);
  return start.toISOString();
}

function redirectToInviteError(message: string, code?: string) {
  const params = new URLSearchParams();

  if (code) {
    params.set("code", code);
  }

  params.set("error", message);
  redirect(`/invite?${params.toString()}`);
}

async function uploadFile(file: File, folder: string) {
  assertUploadFile(file, { allowImages: true, allowVideos: false });
  const extension = getSafeFileExtension(file);
  return uploadMediaToR2(file, `${folder}/${randomUUID()}.${extension}`, file.type);
}

async function uploadChatFile(file: File, profileId: string) {
  assertUploadFile(file);
  const extension = getSafeFileExtension(file);
  return uploadMediaToR2(file, `chat/${profileId}/${randomUUID()}.${extension}`, file.type);
}

async function uploadPostMedia(file: File, folder: string) {
  assertUploadFile(file);
  const extension = getSafeFileExtension(file);
  return uploadMediaToR2(file, `${folder}/${randomUUID()}.${extension}`, file.type);
}

async function uploadAvatarFile(file: File, profileId: string) {
  assertUploadFile(file, { allowImages: true, allowVideos: false });
  const extension = getSafeFileExtension(file);
  return uploadMediaToR2(file, `avatars/${profileId}/${randomUUID()}.${extension}`, file.type);
}

async function removePostStorage(paths: string[]) {
  if (!paths.length) {
    return;
  }

  const admin = createAdminSupabaseClient();
  const uniquePaths = [...new Set(paths)];
  const r2Paths = uniquePaths.filter(isR2StoragePath);
  const supabasePaths = uniquePaths.filter((path) => !isR2StoragePath(path));

  if (supabasePaths.length) {
    await admin.storage.from("post-media").remove(supabasePaths);
  }

  if (r2Paths.length) {
    await deleteR2Objects(r2Paths);
  }
}

async function removeChatStorage(paths: string[]) {
  if (!paths.length) {
    return;
  }

  const admin = createAdminSupabaseClient();
  const uniquePaths = [...new Set(paths)];
  const r2Paths = uniquePaths.filter(isR2StoragePath);
  const supabasePaths = uniquePaths.filter((path) => !isR2StoragePath(path));

  if (supabasePaths.length) {
    await admin.storage.from("chat-media").remove(supabasePaths);
  }

  if (r2Paths.length) {
    await deleteR2Objects(r2Paths);
  }
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formValue(formData.get("email")),
    password: formValue(formData.get("password")),
    next: formValue(formData.get("next")) || undefined
  });

  if (!parsed.success) {
    redirect("/login?error=1");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirect("/login?error=1");
  }

  redirect(getSafeNextPath(parsed.data.next, "/dashboard"));
}

export async function requestPasswordResetAction(formData: FormData) {
  const parsed = passwordResetRequestSchema.safeParse({
    email: formValue(formData.get("email")).toLowerCase()
  });

  if (!parsed.success) {
    redirect("/forgot-password?error=1");
  }

  const supabase = await createServerSupabaseClient();
  const redirectTo = `${await getSiteUrl()}/api/auth/callback?next=/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo
  });

  if (error) {
    console.error("Password reset email request failed", {
      email: parsed.data.email,
      redirectTo,
      message: error.message,
      status: error.status,
      code: error.code
    });

    const params = new URLSearchParams({
      error: "1",
      message: error.message
    });
    redirect(`/forgot-password?${params.toString()}`);
  }

  redirect("/forgot-password?sent=1");
}

export async function updatePasswordAction(formData: FormData) {
  const parsed = passwordUpdateSchema.safeParse({
    password: formValue(formData.get("password")),
    confirmPassword: formValue(formData.get("confirmPassword"))
  });

  if (!parsed.success) {
    redirect("/reset-password?error=1");
  }

  if (parsed.data.password !== parsed.data.confirmPassword) {
    redirect("/reset-password?error=match");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password
  });

  if (error) {
    redirect("/reset-password?error=1");
  }

  redirect("/login?passwordUpdated=1");
}

export async function createPurchaseRequestAction(formData: FormData) {
  const contactMethod = formValue(formData.get("contactMethod"));
  const contactHandle = formValue(formData.get("contactHandle"));
  const parsed = purchaseRequestSchema.safeParse({
    tier: formValue(formData.get("tier")),
    displayName: formValue(formData.get("displayName")),
    email: formValue(formData.get("email")).toLowerCase(),
    country: formValue(formData.get("country")),
    contactMethod,
    contactHandle,
    website: formValue(formData.get("website"))
  });

  if (!parsed.success) {
    redirect("/?inviteRequestError=1#invitation-request");
  }

  const admin = createAdminSupabaseClient();
  const contact = `${parsed.data.contactMethod}: ${parsed.data.contactHandle}`;
  const recentCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recentRequest } = await admin
    .from("purchase_requests")
    .select("id")
    .eq("email", parsed.data.email)
    .gte("created_at", recentCutoff)
    .limit(1)
    .maybeSingle();

  if (recentRequest) {
    redirect("/?inviteRequestSent=1#invitation-request");
  }

  const requestPayload = {
    tier: parsed.data.tier,
    display_name: parsed.data.displayName,
    email: parsed.data.email,
    country: parsed.data.country,
    contact
  };

  const { error } = await admin.from("purchase_requests").insert(requestPayload);

  if (error?.message.includes("display_name")) {
    const { error: fallbackError } = await admin.from("purchase_requests").insert({
      tier: parsed.data.tier,
      email: parsed.data.email,
      country: parsed.data.country,
      contact: `Имя: ${parsed.data.displayName}\nСвязь: ${contact}`
    });

    if (fallbackError) {
      redirect("/?inviteRequestError=1#invitation-request");
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/requests");
    redirect("/?inviteRequestSent=1#invitation-request");
  }

  if (error) {
    redirect("/?inviteRequestError=1#invitation-request");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  redirect("/?inviteRequestSent=1#invitation-request");
}

export async function createDonationClaimAction(formData: FormData) {
  const profile = await requireAnyProfile();
  const parsed = donationClaimSchema.safeParse({
    tier: formValue(formData.get("tier")),
    amount: formValue(formData.get("amount")) ? numberValue(formData.get("amount")) : undefined,
    note: formValue(formData.get("note"))
  });

  if (!parsed.success) {
    redirect("/tg/support?error=1");
  }

  const admin = createAdminSupabaseClient();
  await admin.from("donation_claims").insert({
    profile_id: profile.id,
    suggested_tier: parsed.data.tier,
    amount: typeof parsed.data.amount === "number" ? Number(parsed.data.amount.toFixed(2)) : null,
    note: parsed.data.note,
    status: "new"
  });

  revalidatePath("/tg/support");
  revalidatePath("/tg/admin/donations");
  redirect("/tg/support?sent=1");
}

export async function sendPostEmailCampaignAction(formData: FormData) {
  const profile = await requireAdmin();
  const parsed = postEmailCampaignSchema.safeParse({
    postId: formValue(formData.get("postId")),
    subject: formValue(formData.get("subject")),
    body: formValue(formData.get("body"))
  });

  if (!parsed.success) {
    redirectToAdminEmail({ error: "campaign" });
  }
  const data = parsed.data;

  const admin = createAdminSupabaseClient();
  const { data: post } = await admin
    .from("posts")
    .select("id, title, slug, required_tier, status, publish_at")
    .eq("id", data.postId)
    .single();

  if (!post || post.status !== "published") {
    redirectToAdminEmail({ error: "post_not_ready" });
  }

  const recipients = await getPostEmailRecipients(post.required_tier as Tier);

  if (!recipients.length) {
    redirectToAdminEmail({ error: "no_recipients" });
  }

  const result = await sendEmailCampaign({
    kind: "post",
    title: `Пост: ${post.title}`,
    subject: data.subject,
    body: data.body,
    postId: post.id,
    targetScope: "eligible_post_members",
    targetTiers: [post.required_tier as Tier],
    createdBy: profile.id,
    recipients,
    metadata: {
      post_slug: post.slug,
      post_title: post.title,
      post_url: `${process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "http://localhost:3000"}/club/${post.slug}`,
      publish_at: post.publish_at
    }
  });

  revalidatePath("/admin/email");
  redirectToAdminEmail({
    sent: result.sentCount,
    failed: result.failedCount,
    type: "post"
  });
}

export async function savePostEmailTemplateAction(formData: FormData) {
  const profile = await requireAdmin();
  const parsed = postEmailCampaignSchema.safeParse({
    postId: formValue(formData.get("postId")),
    subject: formValue(formData.get("subject")),
    body: formValue(formData.get("body"))
  });

  if (!parsed.success) {
    redirectToAdminEmail({ error: "template" });
  }

  await savePostEmailTemplate(parsed.data.postId, {
    subject: parsed.data.subject,
    body: parsed.data.body,
    updatedBy: profile.id
  });

  revalidatePath("/admin/email");
  redirectToAdminEmail({ savedTemplate: 1, post: parsed.data.postId });
}

export async function sendManualSponsorEmailAction(formData: FormData) {
  const profile = await requireAdmin();
  const parsed = manualEmailCampaignSchema.safeParse({
    audience: formValue(formData.get("audience")),
    subject: formValue(formData.get("subject")),
    body: formValue(formData.get("body"))
  });

  if (!parsed.success) {
    redirectToAdminEmail({ error: "manual_campaign" });
  }
  const data = parsed.data;

  const recipients = await getManualEmailRecipients(data.audience as ManualEmailAudience);

  if (!recipients.length) {
    redirectToAdminEmail({ error: "no_recipients" });
  }

  const result = await sendEmailCampaign({
    kind: "manual",
    title: `Ручная рассылка: ${data.subject}`,
    subject: data.subject,
    body: data.body,
    targetScope: data.audience,
    createdBy: profile.id,
    recipients,
    metadata: {
      audience: data.audience
    }
  });

  revalidatePath("/admin/email");
  redirectToAdminEmail({
    sent: result.sentCount,
    failed: result.failedCount,
    type: "manual"
  });
}

export async function updateAccessExpiryEmailSettingsAction(formData: FormData) {
  const profile = await requireAdmin();
  const parsed = accessExpiryEmailSettingsSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    daysBefore: parseDaysBefore(formData.get("daysBefore")),
    subject: formValue(formData.get("subject")),
    body: formValue(formData.get("body"))
  });

  if (!parsed.success) {
    redirectToAdminEmail({ error: "settings" });
  }

  await updateAccessExpiryEmailSettings(parsed.data, profile.id);
  revalidatePath("/admin/email");
  redirectToAdminEmail({ saved: 1 });
}

export async function sendAccessExpiryEmailsNowAction() {
  const profile = await requireAdmin();
  const result = await runAutomaticAccessExpiryReminders(profile.id);

  revalidatePath("/admin/email");
  redirectToAdminEmail({
    sent: result.sentCount,
    failed: result.failedCount,
    type: "expiry"
  });
}

export async function updatePurchaseRequestStatusAction(formData: FormData) {
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  const requestId = formValue(formData.get("requestId"));
  const status = formValue(formData.get("status"));

  if (!requestId || !["new", "in_progress", "completed"].includes(status)) {
    revalidatePath("/admin");
    revalidatePath("/admin/requests");
    return;
  }

  await admin
    .from("purchase_requests")
    .update({ status })
    .eq("id", requestId);

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
}

export async function deleteAllPurchaseRequestsAction() {
  await requireAdmin();
  const admin = createAdminSupabaseClient();

  await admin.from("purchase_requests").delete().not("id", "is", null);

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
}

export async function deletePurchaseRequestAction(formData: FormData) {
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  const requestId = formValue(formData.get("requestId"));

  if (!requestId) {
    revalidatePath("/admin");
    revalidatePath("/admin/requests");
    return;
  }

  await admin.from("purchase_requests").delete().eq("id", requestId);

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
}

export async function updateDonationClaimStatusAction(formData: FormData) {
  const adminProfile = await requireAdmin();
  const claimId = formValue(formData.get("claimId"));
  const status = formValue(formData.get("status")) as DonationClaimStatus;

  if (!claimId || !["new", "in_review", "approved", "rejected"].includes(status)) {
    revalidatePath("/tg/admin/donations");
    return;
  }

  const admin = createAdminSupabaseClient();
  await admin
    .from("donation_claims")
    .update({
      status,
      reviewed_at: ["approved", "rejected"].includes(status) ? new Date().toISOString() : null,
      reviewed_by: ["approved", "rejected"].includes(status) ? adminProfile.id : null
    })
    .eq("id", claimId);

  revalidatePath("/tg/admin/donations");
}

export async function approveDonationClaimAction(formData: FormData) {
  const adminProfile = await requireAdmin();
  const claimId = formValue(formData.get("claimId"));
  const tier = formValue(formData.get("tier")) as Tier;
  const accessDays = Number(formValue(formData.get("accessDays")) || "30");

  if (
    !claimId ||
    !["tier_1", "tier_2", "tier_3"].includes(tier) ||
    !Number.isFinite(accessDays) ||
    accessDays <= 0
  ) {
    revalidatePath("/tg/admin/donations");
    return;
  }

  const admin = createAdminSupabaseClient();
  const { data: claim } = await admin
    .from("donation_claims")
    .select("id, profile_id, amount, status")
    .eq("id", claimId)
    .maybeSingle();

  if (!claim || claim.status === "approved") {
    revalidatePath("/tg/admin/donations");
    return;
  }

  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id, total_donations, access_expires_at")
    .eq("id", claim.profile_id)
    .single();

  if (!targetProfile) {
    revalidatePath("/tg/admin/donations");
    return;
  }

  const amount = typeof claim.amount === "number" ? Number(claim.amount) : 0;
  const currentTotal =
    typeof targetProfile.total_donations === "number" ? Number(targetProfile.total_donations) : 0;

  await admin
    .from("profiles")
    .update({
      tier,
      access_status: "active",
      access_expires_at: addDays(targetProfile.access_expires_at, accessDays),
      total_donations: amount > 0 ? Number((currentTotal + amount).toFixed(2)) : currentTotal
    })
    .eq("id", claim.profile_id);

  if (amount > 0) {
    const { donationYear, donationMonth } = currentDonationPeriod();
    await admin.from("donation_events").insert({
      profile_id: claim.profile_id,
      amount: Number(amount.toFixed(2)),
      created_by: adminProfile.id,
      donation_year: donationYear,
      donation_month: donationMonth
    });
  }

  await admin
    .from("donation_claims")
    .update({
      status: "approved",
      suggested_tier: tier,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminProfile.id
    })
    .eq("id", claimId);

  revalidatePath("/tg/admin/donations");
  revalidatePath("/tg/support");
  revalidatePath("/admin/users");
}

export async function signOutAction() {
  const telegramProfile = await getTelegramProfileFromSession();

  if (telegramProfile) {
    await clearTelegramSession();
    redirect("/tg");
  }

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function redeemInviteAction(formData: FormData) {
  const parsed = inviteSchema.safeParse({
    code: formValue(formData.get("code")).toUpperCase(),
    email: formValue(formData.get("email")).toLowerCase(),
    password: formValue(formData.get("password")),
    displayName: formValue(formData.get("displayName"))
  });

  if (!parsed.success) {
    redirectToInviteError("Проверьте поля формы");
  }

  const inviteInput = parsed.data!;
  const admin = createAdminSupabaseClient();

  const { data: invite, error: inviteError } = await admin
    .from("invites")
    .select("*")
    .eq("code", inviteInput.code)
    .is("disabled_at", null)
    .is("used_at", null)
    .single();

  if (inviteError || !invite) {
    redirectToInviteError("Приглашение не найдено, уже использовано или отключено", inviteInput.code);
  }

  if (invite.email && invite.email.toLowerCase() !== inviteInput.email) {
    redirectToInviteError("Это приглашение привязано к другому email", inviteInput.code);
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    redirectToInviteError("Срок действия приглашения истёк", inviteInput.code);
  }

  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existingUser = existingUsers.users.find(
    (user) => user.email?.toLowerCase() === inviteInput.email
  );

  if (existingUser) {
    redirectToInviteError("Пользователь с таким email уже существует", inviteInput.code);
  }

  const createdUser = await admin.auth.admin.createUser({
    email: inviteInput.email,
    password: inviteInput.password,
    email_confirm: true
  });

  const user = createdUser.data.user!;

  if (createdUser.error || !user) {
    redirectToInviteError("Не удалось создать аккаунт", inviteInput.code);
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: user.id,
    email: inviteInput.email,
    display_name: inviteInput.displayName || null,
    role: "member",
    tier: invite.assigned_tier,
    access_status: "active"
  });

  if (profileError) {
    try {
      await admin.auth.admin.deleteUser(user.id);
    } catch {
      // no-op
    }

    redirectToInviteError("Не удалось создать профиль", inviteInput.code);
  }

  const usedAt = new Date().toISOString();
  const { data: claimedInvite, error: claimError } = await admin
    .from("invites")
    .update({
      used_at: usedAt,
      disabled_at: usedAt,
      used_by: user.id
    })
    .eq("id", invite.id)
    .is("used_at", null)
    .is("disabled_at", null)
    .select("id")
    .single();

  if (claimError || !claimedInvite) {
    try {
      await admin.from("profiles").delete().eq("id", user.id);
      await admin.auth.admin.deleteUser(user.id);
    } catch {
      // Cleanup problems should not break the invite screen UX.
    }

    redirectToInviteError("Это приглашение уже использовано или отключено", inviteInput.code);
  }

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signInWithPassword({
    email: inviteInput.email,
    password: inviteInput.password
  });

  redirect("/dashboard");
}

export async function updateProfileAction(formData: FormData) {
  const profile = await requireProfile();
  const telegramProfile = await getTelegramProfileFromSession();
  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const avatarFile = formData.get("avatar");
  let nextAvatarUrl = profile.avatar_url;

  if (avatarFile instanceof File && avatarFile.size > 0) {
    const uploadedAvatar = await uploadAvatarFile(avatarFile, profile.id);
    nextAvatarUrl = uploadedAvatar.storagePath;

    if (profile.avatar_url) {
      await deleteMedia(
        {
          provider: isR2StoragePath(profile.avatar_url) ? "r2" : "supabase",
          storage_path: profile.avatar_url
        },
        { supabase: admin, legacyBucket: "post-media" }
      );
    }
  }

  const payload = {
    display_name: formValue(formData.get("displayName")) || null,
    bio: formValue(formData.get("bio")) || null,
    avatar_url: nextAvatarUrl
  };

  if (telegramProfile) {
    await admin.from("profiles").update(payload).eq("id", profile.id);
    revalidatePath("/tg/profile");
  } else {
    await supabase.from("profiles").update(payload).eq("id", profile.id);
  }

  revalidatePath("/profile");
  revalidatePath("/chat");
  revalidatePath("/club");
}

export async function createPostCommentAction(formData: FormData) {
  const profile = await requireAnyProfile();
  const parsed = commentSchema.safeParse({
    postId: formValue(formData.get("postId")),
    postSlug: formValue(formData.get("postSlug")),
    body: formValue(formData.get("body"))
  });

  if (!parsed.success) {
    revalidatePostSpace(formValue(formData.get("postSlug")));
    return;
  }

  const admin = createAdminSupabaseClient();
  const { data: post } = await admin
    .from("posts")
    .select("id, slug, status, publish_at, expires_at, required_tier")
    .eq("id", parsed.data.postId)
    .single();

  const postIsAvailable =
    post &&
    post.slug === parsed.data.postSlug &&
    post.status === "published" &&
    new Date(post.publish_at) <= new Date() &&
    (!post.expires_at || new Date(post.expires_at) > new Date()) &&
    hasClubAccess(profile) &&
    canAccessTier(profile.tier, post.required_tier);

  if (!postIsAvailable) {
    revalidatePostSpace(parsed.data.postSlug);
    return;
  }

  await admin.from("post_comments").insert({
    post_id: parsed.data.postId,
    profile_id: profile.id,
    body: parsed.data.body
  });

  revalidatePostSpace(parsed.data.postSlug);
}

export async function deletePostCommentAction(formData: FormData) {
  const profile = await requireAnyProfile();
  const commentId = formValue(formData.get("commentId"));
  const postSlug = formValue(formData.get("postSlug"));

  if (!commentId || !postSlug) {
    revalidatePostSpace(postSlug);
    return;
  }

  const admin = createAdminSupabaseClient();
  const { data: comment } = await admin
    .from("post_comments")
    .select("id, profile_id")
    .eq("id", commentId)
    .single();

  if (!comment) {
    revalidatePostSpace(postSlug);
    return;
  }

  const canDelete = profile.role === "admin" || comment.profile_id === profile.id;

  if (!canDelete) {
    revalidatePostSpace(postSlug);
    return;
  }

  await admin.from("post_comments").delete().eq("id", commentId);

  revalidatePostSpace(postSlug);
}

export async function togglePostReactionAction(formData: FormData) {
  const profile = await requireAnyProfile();
  const parsed = postReactionSchema.safeParse({
    postId: formValue(formData.get("postId")),
    postSlug: formValue(formData.get("postSlug")),
    reaction: formValue(formData.get("reaction"))
  });

  if (!parsed.success) {
    revalidatePostSpace(formValue(formData.get("postSlug")));
    return;
  }

  const admin = createAdminSupabaseClient();
  const { data: post } = await admin
    .from("posts")
    .select("id, slug, status, publish_at, expires_at, required_tier")
    .eq("id", parsed.data.postId)
    .single();

  const postIsAvailable =
    post &&
    post.slug === parsed.data.postSlug &&
    post.status === "published" &&
    new Date(post.publish_at) <= new Date() &&
    (!post.expires_at || new Date(post.expires_at) > new Date()) &&
    hasClubAccess(profile) &&
    canAccessTier(profile.tier, post.required_tier);

  if (!postIsAvailable) {
    revalidatePostSpace(parsed.data.postSlug);
    return;
  }

  const { data: existingReaction } = await admin
    .from("post_reactions")
    .select("id, reaction")
    .eq("post_id", parsed.data.postId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (existingReaction?.reaction === parsed.data.reaction) {
    await admin.from("post_reactions").delete().eq("id", existingReaction.id);
  } else {
    await admin.from("post_reactions").upsert(
      {
        post_id: parsed.data.postId,
        profile_id: profile.id,
        reaction: parsed.data.reaction,
        updated_at: new Date().toISOString()
      },
      { onConflict: "post_id,profile_id" }
    );
  }

  revalidatePostSpace(parsed.data.postSlug);
}

export async function togglePostCommentReactionAction(formData: FormData) {
  const profile = await requireAnyProfile();
  const parsed = commentReactionSchema.safeParse({
    commentId: formValue(formData.get("commentId")),
    postSlug: formValue(formData.get("postSlug")),
    reaction: formValue(formData.get("reaction"))
  });

  if (!parsed.success) {
    revalidatePostSpace(formValue(formData.get("postSlug")));
    return;
  }

  const admin = createAdminSupabaseClient();
  const { data: comment } = await admin
    .from("post_comments")
    .select("id, post_id, posts!inner(slug, status, publish_at, expires_at, required_tier)")
    .eq("id", parsed.data.commentId)
    .single();

  const post = Array.isArray(comment?.posts) ? comment?.posts[0] : comment?.posts;
  const commentIsAvailable =
    comment &&
    post &&
    post.slug === parsed.data.postSlug &&
    post.status === "published" &&
    new Date(post.publish_at) <= new Date() &&
    (!post.expires_at || new Date(post.expires_at) > new Date()) &&
    hasClubAccess(profile) &&
    canAccessTier(profile.tier, post.required_tier as Tier);

  if (!commentIsAvailable) {
    revalidatePostSpace(parsed.data.postSlug);
    return;
  }

  const { data: existingReaction } = await admin
    .from("post_comment_reactions")
    .select("id, reaction")
    .eq("comment_id", parsed.data.commentId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (existingReaction?.reaction === parsed.data.reaction) {
    await admin.from("post_comment_reactions").delete().eq("id", existingReaction.id);
  } else {
    await admin.from("post_comment_reactions").upsert(
      {
        comment_id: parsed.data.commentId,
        profile_id: profile.id,
        reaction: parsed.data.reaction,
        updated_at: new Date().toISOString()
      },
      { onConflict: "comment_id,profile_id" }
    );
  }

  revalidatePostSpace(parsed.data.postSlug);
}

export async function togglePostPinAction(formData: FormData) {
  await requireAdmin();
  const postId = formValue(formData.get("postId"));
  const postSlug = formValue(formData.get("postSlug"));

  if (!postId || !postSlug) {
    revalidatePostSpace(postSlug);
    return;
  }

  const admin = createAdminSupabaseClient();
  const { data: post } = await admin.from("posts").select("id, is_pinned").eq("id", postId).maybeSingle();

  if (!post) {
    revalidatePostSpace(postSlug);
    return;
  }

  const nextPinned = !post.is_pinned;
  await admin
    .from("posts")
    .update({
      is_pinned: nextPinned,
      pinned_at: nextPinned ? new Date().toISOString() : null
    })
    .eq("id", postId);

  revalidatePostSpace(postSlug);
}

export async function sendMemberChatMessageAction(formData: FormData) {
  const profile = await requireProfile();
  const admin = createAdminSupabaseClient();
  const body = formValue(formData.get("body"));

  await cleanupOldChatMessages(admin);

  if (!body) {
    revalidatePath("/profile");
    revalidatePath("/chat");
    return;
  }

  await admin.from("member_chat_messages").insert({
    profile_id: profile.id,
    sender_role: "member",
    body,
    read_by_admin_at: null,
    read_by_member_at: new Date().toISOString()
  });

  revalidatePath("/profile");
  revalidatePath("/chat");
  revalidatePath("/admin/users");
  revalidatePath("/admin/chat");
}

export async function sendAdminChatMessageAction(formData: FormData) {
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  const profileId = formValue(formData.get("profileId"));
  const body = formValue(formData.get("body"));
  const mediaFile =
    formData.get("media") instanceof File && (formData.get("media") as File).size > 0
      ? (formData.get("media") as File)
      : null;

  await cleanupOldChatMessages(admin);

  if (!profileId || (!body && !mediaFile)) {
    revalidatePath("/admin/users");
    revalidatePath("/admin/chat");
    return;
  }

  let mediaPath: string | null = null;
  let mediaType: "image" | "video" | "file" | null = null;
  let uploadedChatMedia: Awaited<ReturnType<typeof uploadChatFile>> | null = null;

  if (mediaFile) {
    if (!mediaFile.type.startsWith("image/") && !mediaFile.type.startsWith("video/")) {
      throw new Error("В чат можно загрузить только фото или видео.");
    }

    uploadedChatMedia = await uploadChatFile(mediaFile, profileId);
    mediaPath = uploadedChatMedia.storagePath;
    mediaType = getUploadMediaType(mediaFile);
  }

  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("role", "member")
    .eq("access_status", "active")
    .maybeSingle();

  if (!targetProfile) {
    if (mediaPath) {
      await removeChatStorage([mediaPath]);
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/chat");
    return;
  }

  await admin.from("member_chat_messages").insert({
    profile_id: profileId,
    sender_role: "admin",
    body: body || null,
    media_path: mediaPath,
    media_provider: uploadedChatMedia?.provider ?? null,
    media_bucket: uploadedChatMedia?.bucket ?? null,
    media_object_key: uploadedChatMedia?.objectKey ?? null,
    media_mime_type: uploadedChatMedia?.contentType ?? null,
    media_size_bytes: uploadedChatMedia?.sizeBytes ?? null,
    media_type: mediaType,
    read_by_admin_at: new Date().toISOString(),
    read_by_member_at: null
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/chat");
  revalidatePath("/profile");
  revalidatePath("/chat");
}

export async function deleteUserChatAction(formData: FormData) {
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  const profileId = formValue(formData.get("profileId"));

  if (!profileId) {
    revalidatePath("/admin/chat");
    return;
  }

  const { data: messages } = await admin
    .from("member_chat_messages")
    .select("media_path")
    .eq("profile_id", profileId);

  await removeChatStorage(
    (messages ?? [])
      .map((message) => message.media_path)
      .filter((path): path is string => Boolean(path))
  );

  await admin.from("member_chat_messages").delete().eq("profile_id", profileId);

  revalidatePath("/admin/chat");
  revalidatePath("/admin/users");
  revalidatePath("/chat");
}

export async function deleteAllChatAction() {
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  const { data: messages } = await admin.from("member_chat_messages").select("media_path");

  await removeChatStorage(
    (messages ?? [])
      .map((message) => message.media_path)
      .filter((path): path is string => Boolean(path))
  );

  await admin.from("member_chat_messages").delete().not("id", "is", null);

  revalidatePath("/admin");
  revalidatePath("/admin/chat");
  revalidatePath("/admin/users");
  revalidatePath("/chat");
}

export async function createInviteAction(formData: FormData) {
  const adminProfile = await requireAdmin();
  const admin = createAdminSupabaseClient();
  const code = `VIP-${randomUUID().slice(0, 8).toUpperCase()}`;
  const expiresAtValue = formValue(formData.get("expiresAt"));
  const defaultExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await admin.from("invites").insert({
    code,
    email: formValue(formData.get("email")) || null,
    assigned_tier: formValue(formData.get("assignedTier")) as Tier,
    expires_at: expiresAtValue ? new Date(expiresAtValue).toISOString() : defaultExpiresAt,
    note: formValue(formData.get("note")) || null,
    created_by: adminProfile.id
  });

  revalidatePath("/admin/invites");
}

export async function disableInviteAction(formData: FormData) {
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  const inviteId = formValue(formData.get("inviteId"));

  await admin
    .from("invites")
    .update({ disabled_at: new Date().toISOString() })
    .eq("id", inviteId);

  revalidatePath("/admin/invites");
}

export async function deleteInviteAction(formData: FormData) {
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  const inviteId = formValue(formData.get("inviteId"));

  if (!inviteId) {
    revalidatePath("/admin");
    revalidatePath("/admin/invites");
    return;
  }

  await admin.from("invites").delete().eq("id", inviteId);

  revalidatePath("/admin");
  revalidatePath("/admin/invites");
}

export async function deleteAllInvitesAction() {
  await requireAdmin();
  const admin = createAdminSupabaseClient();

  await admin.from("invites").delete().not("id", "is", null);

  revalidatePath("/admin");
  revalidatePath("/admin/invites");
}

export async function createPostAction(formData: FormData) {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();

  const title = formValue(formData.get("title"));
  const slug = buildContentSlug(title);
  const thumbnailFile = formData.get("thumbnail");
  const mediaFiles = formData
    .getAll("media")
    .filter((value) => value instanceof File && value.size > 0) as File[];

  let thumbnailPath: string | null = null;
  let thumbnailProvider: string | null = null;
  let thumbnailBucket: string | null = null;
  let thumbnailObjectKey: string | null = null;
  let thumbnailMimeType: string | null = null;
  let thumbnailSizeBytes: number | null = null;

  if (thumbnailFile instanceof File && thumbnailFile.size > 0) {
    const uploadedThumbnail = await uploadFile(thumbnailFile, "thumbnails");
    thumbnailPath = uploadedThumbnail.storagePath;
    thumbnailProvider = uploadedThumbnail.provider;
    thumbnailBucket = uploadedThumbnail.bucket;
    thumbnailObjectKey = uploadedThumbnail.objectKey;
    thumbnailMimeType = uploadedThumbnail.contentType;
    thumbnailSizeBytes = uploadedThumbnail.sizeBytes;
  }

  const { data: post, error } = await admin
    .from("posts")
    .insert({
      title,
      slug,
      description: formValue(formData.get("description")) || null,
      body: formValue(formData.get("body")) || null,
      post_type: formValue(formData.get("postType")) as PostType,
      required_tier: formValue(formData.get("requiredTier")) as Tier,
      status: formValue(formData.get("status")) as PostStatus,
      publish_at: formValue(formData.get("publishAt"))
        ? new Date(formValue(formData.get("publishAt"))).toISOString()
        : new Date().toISOString(),
      thumbnail_path: thumbnailPath,
      thumbnail_provider: thumbnailProvider,
      thumbnail_bucket: thumbnailBucket,
      thumbnail_object_key: thumbnailObjectKey,
      thumbnail_mime_type: thumbnailMimeType,
      thumbnail_size_bytes: thumbnailSizeBytes,
      author_id: profile.id
    })
    .select("id")
    .single();

  if (error || !post) {
    await cleanupOrphanedStorage(admin);
    throw new Error(error?.message || "Post creation failed");
  }

  for (const [index, file] of mediaFiles.entries()) {
    const uploaded = await uploadPostMedia(file, `posts/${post.id}`);
    const mediaType = getUploadMediaType(file);

    const { error: mediaError } = await admin.from("post_media").insert({
      post_id: post.id,
      storage_path: uploaded.storagePath,
      storage_provider: uploaded.provider,
      storage_bucket: uploaded.bucket,
      storage_object_key: uploaded.objectKey,
      mime_type: uploaded.contentType,
      size_bytes: uploaded.sizeBytes,
      media_type: mediaType,
      sort_order: index
    });

    if (mediaError) {
      await cleanupOrphanedStorage(admin);
      throw new Error(mediaError.message);
    }
  }

  revalidatePath("/admin/posts");
  revalidatePath("/admin/email");
  revalidatePath("/feed");
  revalidatePath("/club");
}

export async function updatePostAction(formData: FormData) {
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  const title = formValue(formData.get("title"));

  await admin
    .from("posts")
    .update({
      title,
      slug: buildContentSlug(title),
      description: formValue(formData.get("description")) || null,
      body: formValue(formData.get("body")) || null,
      post_type: formValue(formData.get("postType")) as PostType,
      required_tier: formValue(formData.get("requiredTier")) as Tier,
      status: formValue(formData.get("status")) as PostStatus
    })
    .eq("id", formValue(formData.get("postId")));

  revalidatePath("/admin/posts");
  revalidatePath("/admin/email");
  revalidatePath("/feed");
  revalidatePath("/club");
}

export async function deletePostAction(formData: FormData) {
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  const postId = formValue(formData.get("postId"));

  const { data: post } = await admin.from("posts").select("thumbnail_path, slug").eq("id", postId).single();
  const { data: media } = await admin.from("post_media").select("storage_path").eq("post_id", postId);

  await removePostStorage([
    ...(post?.thumbnail_path ? [post.thumbnail_path] : []),
    ...((media ?? []).map((item) => item.storage_path))
  ]);

  await admin.from("posts").delete().eq("id", postId);

  revalidatePath("/admin/posts");
  revalidatePath("/admin/email");
  revalidatePath("/feed");
  if (post?.slug) {
    revalidatePostSpace(post.slug);
  } else {
    revalidatePath("/club");
  }
}

export async function deleteAllPostsAction() {
  await requireAdmin();
  const admin = createAdminSupabaseClient();

  const [{ data: posts }, { data: media }] = await Promise.all([
    admin.from("posts").select("thumbnail_path"),
    admin.from("post_media").select("storage_path")
  ]);

  await removePostStorage([
    ...((posts ?? [])
      .map((post) => post.thumbnail_path)
      .filter((path): path is string => Boolean(path))),
    ...((media ?? []).map((item) => item.storage_path))
  ]);

  await admin.from("posts").delete().not("id", "is", null);

  revalidatePath("/admin/posts");
  revalidatePath("/admin/email");
  revalidatePath("/feed");
  revalidatePath("/club");
}

export async function checkStorageCleanupAction(
  _prevState: CleanupCheckState,
  _formData: FormData
): Promise<CleanupCheckState> {
  void _prevState;
  void _formData;

  try {
    await requireAdmin();
    const admin = createAdminSupabaseClient();
    const report = await getOrphanedStorageReport(admin);
    const megabytes = report.totalBytes / 1024 / 1024;

    return {
      status: "success",
      message:
        report.totalCount > 0
          ? `Проверка выполнена. Найдено ${report.totalCount} файлов. Можно очистить ${
              megabytes < 10 ? megabytes.toFixed(1) : Math.round(megabytes)
            } MB.`
          : "Проверка выполнена. Лишних файлов не найдено.",
      fileCount: report.totalCount,
      totalBytes: report.totalBytes
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось проверить хранилище.",
      fileCount: 0,
      totalBytes: 0
    };
  }
}

export async function deleteOldPostsAction() {
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  const postIds = await getOldPostIds(admin);

  if (!postIds.length) {
    revalidatePath("/admin");
    revalidatePath("/admin/posts");
    return;
  }

  const [{ data: posts }, { data: media }] = await Promise.all([
    admin.from("posts").select("thumbnail_path").in("id", postIds),
    admin.from("post_media").select("storage_path").in("post_id", postIds)
  ]);

  await removePostStorage([
    ...((posts ?? [])
      .map((post) => post.thumbnail_path)
      .filter((path): path is string => Boolean(path))),
    ...((media ?? []).map((item) => item.storage_path))
  ]);

  await admin.from("posts").delete().in("id", postIds);

  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  revalidatePath("/feed");
}

export async function deleteOrphanMediaAction(formData: FormData) {
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  const provider = formValue(formData.get("provider")) || null;
  const bucket = formValue(formData.get("bucket")) || null;
  const objectKey = formValue(formData.get("objectKey")) || null;
  const path = formValue(formData.get("path")) || null;

  if (!path && !objectKey) {
    revalidatePath("/admin");
    revalidatePath("/admin/media");
    return;
  }

  const [{ data: linkedPost }, { data: linkedMedia }, { data: linkedChatMedia }] = await Promise.all([
    admin.from("posts").select("id").eq("thumbnail_path", path).limit(1).maybeSingle(),
    admin.from("post_media").select("id").eq("storage_path", path).limit(1).maybeSingle(),
    admin.from("member_chat_messages").select("id").eq("media_path", path).limit(1).maybeSingle()
  ]);

  if (linkedPost || linkedMedia || linkedChatMedia) {
    revalidatePath("/admin");
    revalidatePath("/admin/media");
    return;
  }

  await deleteMedia(
    {
      provider,
      bucket,
      object_key: objectKey,
      storage_path: path
    },
    {
      supabase: admin,
      legacyBucket: bucket === "chat-media" ? "chat-media" : "post-media"
    }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/media");
}

export async function deleteAllOrphanMediaAction() {
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  const report = await getOrphanedStorageReport(admin);

  await Promise.all(
    report.postMedia.map((item) =>
      deleteMedia(
        { provider: "supabase", bucket: "post-media", object_key: item.path, storage_path: item.path },
        { supabase: admin, legacyBucket: "post-media" }
      )
    )
  );

  await Promise.all(
    report.chatMedia.map((item) =>
      deleteMedia(
        { provider: "supabase", bucket: "chat-media", object_key: item.path, storage_path: item.path },
        { supabase: admin, legacyBucket: "chat-media" }
      )
    )
  );

  await Promise.all(
    report.r2Media.map((item) =>
      deleteMedia(
        { provider: "r2", object_key: item.path.slice(3), storage_path: item.path },
        { supabase: admin }
      )
    )
  );

  revalidatePath("/admin");
  revalidatePath("/admin/media");
  revalidatePath("/admin/chat");
}

export async function deleteMediaAction(formData: FormData) {
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  const source = formValue(formData.get("source"));
  const id = formValue(formData.get("id"));
  const provider = formValue(formData.get("provider")) || null;
  const bucket = formValue(formData.get("bucket")) || null;
  const objectKey = formValue(formData.get("objectKey")) || null;
  const path = formValue(formData.get("path")) || null;

  if (!path && !objectKey) {
    revalidatePath("/admin/media");
    return;
  }

  await deleteMedia(
    {
      provider,
      bucket,
      object_key: objectKey,
      storage_path: path
    },
    { supabase: admin, legacyBucket: source === "chat" ? "chat-media" : "post-media" }
  );

  if (source === "thumbnail" && id) {
    await admin
      .from("posts")
      .update({
        thumbnail_path: null,
        thumbnail_provider: null,
        thumbnail_bucket: null,
        thumbnail_object_key: null,
        thumbnail_mime_type: null,
        thumbnail_size_bytes: null
      })
      .eq("id", id);
  }

  if (source === "media" && id) {
    await admin.from("post_media").delete().eq("id", id);
  }

  revalidatePath("/admin/media");
  revalidatePath("/admin/posts");
  revalidatePath("/feed");
}

export async function updateUserAccessAction(formData: FormData) {
  const adminProfile = await requireAdmin();
  const userId = formValue(formData.get("userId"));

  if (userId === adminProfile.id) {
    revalidatePath("/admin/users");
    return;
  }

  const admin = createAdminSupabaseClient();
  await admin
    .from("profiles")
    .update({
      tier: formValue(formData.get("tier")) as Tier,
      access_status: formValue(formData.get("accessStatus")) as AccessStatus
    })
    .eq("id", userId);

  revalidatePath("/admin/users");
  revalidatePath("/feed");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

export async function updateUserDetailsAction(formData: FormData) {
  const adminProfile = await requireAdmin();
  const userId = formValue(formData.get("userId"));

  if (userId === adminProfile.id) {
    revalidatePath("/admin/users");
    return;
  }

  const admin = createAdminSupabaseClient();
  const avatarFile = formData.get("avatar");
  const nextTier = formValue(formData.get("tier")) as Tier;
  const nextAccessStatus = formValue(formData.get("accessStatus")) as AccessStatus;
  const nextBadges = formData
    .getAll("adminBadges")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  const { data: existingUser } = await admin
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .single();

  let nextAvatarUrl = existingUser?.avatar_url ?? null;

  if (avatarFile instanceof File && avatarFile.size > 0) {
    const uploadedAvatar = await uploadAvatarFile(avatarFile, userId);
    nextAvatarUrl = uploadedAvatar.storagePath;

    if (existingUser?.avatar_url) {
      await deleteMedia(
        {
          provider: isR2StoragePath(existingUser.avatar_url) ? "r2" : "supabase",
          storage_path: existingUser.avatar_url
        },
        { supabase: admin, legacyBucket: "post-media" }
      );
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({
      display_name: formValue(formData.get("displayName")) || null,
      nickname: formValue(formData.get("nickname")) || null,
      avatar_url: nextAvatarUrl,
      birth_date: formValue(formData.get("birthDate")) || null,
      telegram_contact: formValue(formData.get("telegramContact")) || null,
      tiktok_contact: formValue(formData.get("tiktokContact")) || null,
      admin_note: formValue(formData.get("adminNote")) || null,
      admin_badges: nextBadges,
      tier: nextTier,
      access_status: nextAccessStatus
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Не удалось обновить пользователя: ${error.message}`);
  }

  revalidatePath("/admin/users");
  revalidatePath("/feed");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/admin/chat");
}

export async function addUserDonationAction(formData: FormData) {
  const adminProfile = await requireAdmin();
  const userId = formValue(formData.get("userId"));
  const donationDelta = numberValue(formData.get("donationDelta"));

  if (!userId || donationDelta <= 0) {
    revalidatePath("/admin/users");
    return;
  }

  const admin = createAdminSupabaseClient();
  const { donationYear, donationMonth } = currentDonationPeriod();
  const { data: profile } = await admin
    .from("profiles")
    .select("total_donations")
    .eq("id", userId)
    .single();

  const currentTotal =
    profile && typeof profile.total_donations === "number" ? Number(profile.total_donations) : 0;

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      total_donations: Number((currentTotal + donationDelta).toFixed(2))
    })
    .eq("id", userId);

  if (profileError) {
    throw new Error(`Не удалось обновить сумму донатов: ${profileError.message}`);
  }

  const { error: donationError } = await admin.from("donation_events").insert({
    profile_id: userId,
    amount: Number(donationDelta.toFixed(2)),
    created_by: adminProfile.id,
    donation_year: donationYear,
    donation_month: donationMonth
  });

  if (donationError) {
    throw new Error(`Не удалось сохранить донат: ${donationError.message}`);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/email");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export async function addUserDonationForMonthAction(formData: FormData) {
  const adminProfile = await requireAdmin();
  const userId = formValue(formData.get("userId"));
  const donationDelta = numberValue(formData.get("donationDelta"));
  const year = Number(formValue(formData.get("year")));
  const monthIndex = Number(formValue(formData.get("month")));

  if (
    !userId ||
    donationDelta <= 0 ||
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    year < 2000 ||
    year > 2100 ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    revalidatePath("/admin/users");
    return;
  }

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("total_donations")
    .eq("id", userId)
    .single();

  const currentTotal =
    profile && typeof profile.total_donations === "number" ? Number(profile.total_donations) : 0;

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      total_donations: Number((currentTotal + donationDelta).toFixed(2))
    })
    .eq("id", userId);

  if (profileError) {
    throw new Error(`Не удалось обновить сумму донатов: ${profileError.message}`);
  }

  const donationMonth = monthIndex + 1;
  const eventDate = new Date(Date.UTC(year, monthIndex, 15, 12, 0, 0)).toISOString();

  const { error: donationError } = await admin.from("donation_events").insert({
    profile_id: userId,
    amount: Number(donationDelta.toFixed(2)),
    created_by: adminProfile.id,
    donation_year: year,
    donation_month: donationMonth,
    created_at: eventDate
  });

  if (donationError) {
    throw new Error(`Не удалось сохранить донат за месяц: ${donationError.message}`);
  }

  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export async function extendUserAccessAction(formData: FormData) {
  await requireAdmin();
  const userId = formValue(formData.get("userId"));

  if (!userId) {
    revalidatePath("/admin/users");
    return;
  }

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("access_expires_at")
    .eq("id", userId)
    .single();

  const now = new Date();
  const baseDate =
    profile?.access_expires_at && new Date(profile.access_expires_at) > now
      ? new Date(profile.access_expires_at)
      : now;

  baseDate.setDate(baseDate.getDate() + 30);

  await admin
    .from("profiles")
    .update({
      access_expires_at: baseDate.toISOString(),
      access_status: "active"
    })
    .eq("id", userId);

  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
}

export async function setUserAccessUntilAction(formData: FormData) {
  const adminProfile = await requireAdmin();
  const userId = formValue(formData.get("userId"));
  const accessUntil = formValue(formData.get("accessUntil"));

  if (!userId || userId === adminProfile.id) {
    revalidatePath("/admin/users");
    return;
  }

  const parsedDate = accessUntil ? new Date(accessUntil) : null;

  if (accessUntil && (!parsedDate || Number.isNaN(parsedDate.getTime()))) {
    revalidatePath("/admin/users");
    return;
  }

  const admin = createAdminSupabaseClient();
  await admin
    .from("profiles")
    .update({
      access_expires_at: parsedDate ? parsedDate.toISOString() : null,
      access_status: "active"
    })
    .eq("id", userId);

  revalidatePath("/admin/users");
  revalidatePath("/admin/email");
  revalidatePath("/dashboard");
  revalidatePath("/feed");
  revalidatePath("/profile");
}

export async function deleteUserAction(formData: FormData) {
  const adminProfile = await requireAdmin();
  const userId = formValue(formData.get("userId"));

  if (userId === adminProfile.id) {
    revalidatePath("/admin/users");
    return;
  }

  const admin = createAdminSupabaseClient();
  await admin.from("profiles").delete().eq("id", userId);
  await admin.auth.admin.deleteUser(userId);

  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
}
