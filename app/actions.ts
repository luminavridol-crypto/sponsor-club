"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireProfile } from "@/lib/auth/guards";
import { cleanupOldChatMessages } from "@/lib/data/chat";
import { deleteR2Objects, isR2StoragePath, uploadVideoToR2 } from "@/lib/r2/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AccessStatus, PostStatus, PostType, Tier } from "@/lib/types";
import { slugify } from "@/lib/utils/slug";
import { canAccessTier } from "@/lib/utils/tier";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
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
  displayName: z.string().min(2),
  email: z.string().email(),
  country: z.string().min(2),
  contactMethod: z.enum(["Telegram", "Instagram", "Email", "Other"]),
  contactHandle: z.string().min(2)
});

const commentSchema = z.object({
  postId: z.string().uuid(),
  postSlug: z.string().min(1),
  body: z.string().trim().min(1).max(1000)
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

function currentDonationPeriod() {
  const now = new Date();

  return {
    donationYear: now.getUTCFullYear(),
    donationMonth: now.getUTCMonth() + 1
  };
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function humanizeStorageError(message: string) {
  if (message.includes("The object exceeded the maximum allowed size")) {
    return "Файл слишком большой для текущего лимита в Supabase Storage. Увеличь лимит нужного bucket.";
  }

  if (message.includes("Bucket not found")) {
    return "Нужный bucket не найден в Supabase Storage.";
  }

  return message;
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
  const admin = createAdminSupabaseClient();
  const extension = file.name.split(".").pop() || "bin";
  const fileName = `${folder}/${randomUUID()}.${extension}`;
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await admin.storage
    .from("post-media")
    .upload(fileName, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: false
    });

  if (error) {
    throw new Error(humanizeStorageError(error.message));
  }

  return fileName;
}

async function uploadChatFile(file: File, profileId: string) {
  const admin = createAdminSupabaseClient();
  const extension = file.name.split(".").pop() || "bin";
  const fileName = `${profileId}/${randomUUID()}.${extension}`;
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await admin.storage
    .from("chat-media")
    .upload(fileName, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: false
    });

  if (error) {
    throw new Error(humanizeStorageError(error.message));
  }

  return fileName;
}

async function uploadPostMedia(file: File, folder: string) {
  if (file.type.startsWith("video/")) {
    return uploadVideoToR2(file, folder);
  }

  return uploadFile(file, folder);
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
  await admin.storage.from("chat-media").remove(uniquePaths);
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formValue(formData.get("email")),
    password: formValue(formData.get("password"))
  });

  if (!parsed.success) {
    redirect("/login?error=1");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirect("/login?error=1");
  }

  redirect("/dashboard");
}

export async function requestPasswordResetAction(formData: FormData) {
  const parsed = passwordResetRequestSchema.safeParse({
    email: formValue(formData.get("email"))
  });

  if (!parsed.success) {
    redirect("/forgot-password?error=1");
  }

  const supabase = await createServerSupabaseClient();
  const redirectTo = `${getSiteUrl()}/api/auth/callback?next=/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo
  });

  if (error) {
    redirect("/forgot-password?error=1");
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
    contactHandle
  });

  if (!parsed.success) {
    redirect("/?inviteRequestError=1#invitation-request");
  }

  const admin = createAdminSupabaseClient();
  const contact = `${parsed.data.contactMethod}: ${parsed.data.contactHandle}`;
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

export async function signOutAction() {
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
  const supabase = await createServerSupabaseClient();

  await supabase
    .from("profiles")
    .update({
      display_name: formValue(formData.get("displayName")) || null,
      bio: formValue(formData.get("bio")) || null
    })
    .eq("id", profile.id);

  revalidatePath("/profile");
}

export async function createPostCommentAction(formData: FormData) {
  const profile = await requireProfile();
  const parsed = commentSchema.safeParse({
    postId: formValue(formData.get("postId")),
    postSlug: formValue(formData.get("postSlug")),
    body: formValue(formData.get("body"))
  });

  if (!parsed.success) {
    revalidatePath("/feed");
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
    canAccessTier(profile.tier, post.required_tier);

  if (!postIsAvailable) {
    revalidatePath("/feed");
    return;
  }

  await admin.from("post_comments").insert({
    post_id: parsed.data.postId,
    profile_id: profile.id,
    body: parsed.data.body
  });

  revalidatePath("/feed");
  revalidatePath(`/feed/${parsed.data.postSlug}`);
}

export async function deletePostCommentAction(formData: FormData) {
  const profile = await requireProfile();
  const commentId = formValue(formData.get("commentId"));
  const postSlug = formValue(formData.get("postSlug"));

  if (!commentId || !postSlug) {
    revalidatePath("/feed");
    return;
  }

  const admin = createAdminSupabaseClient();
  const { data: comment } = await admin
    .from("post_comments")
    .select("id, profile_id")
    .eq("id", commentId)
    .single();

  if (!comment) {
    revalidatePath(`/feed/${postSlug}`);
    return;
  }

  const canDelete = profile.role === "admin" || comment.profile_id === profile.id;

  if (!canDelete) {
    revalidatePath(`/feed/${postSlug}`);
    return;
  }

  await admin.from("post_comments").delete().eq("id", commentId);

  revalidatePath("/feed");
  revalidatePath(`/feed/${postSlug}`);
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
  let mediaType: "image" | "video" | null = null;

  if (mediaFile) {
    if (!mediaFile.type.startsWith("image/") && !mediaFile.type.startsWith("video/")) {
      throw new Error("В чат можно загрузить только фото или видео.");
    }

    mediaPath = await uploadChatFile(mediaFile, profileId);
    mediaType = mediaFile.type.startsWith("video/") ? "video" : "image";
  }

  await admin.from("member_chat_messages").insert({
    profile_id: profileId,
    sender_role: "admin",
    body: body || null,
    media_path: mediaPath,
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

export async function createPostAction(formData: FormData) {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();

  const title = formValue(formData.get("title"));
  const slug = slugify(title);
  const thumbnailFile = formData.get("thumbnail");
  const mediaFiles = formData
    .getAll("media")
    .filter((value) => value instanceof File && value.size > 0) as File[];

  let thumbnailPath: string | null = null;
  if (thumbnailFile instanceof File && thumbnailFile.size > 0) {
    thumbnailPath = await uploadFile(thumbnailFile, "thumbnails");
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
      author_id: profile.id
    })
    .select("id")
    .single();

  if (error || !post) {
    throw new Error(error?.message || "Post creation failed");
  }

  for (const [index, file] of mediaFiles.entries()) {
    const storagePath = await uploadPostMedia(file, `posts/${post.id}`);
    const mediaType = file.type.startsWith("video/") ? "video" : "image";

    await admin.from("post_media").insert({
      post_id: post.id,
      storage_path: storagePath,
      media_type: mediaType,
      sort_order: index
    });
  }

  revalidatePath("/admin/posts");
  revalidatePath("/feed");
}

export async function updatePostAction(formData: FormData) {
  await requireAdmin();
  const admin = createAdminSupabaseClient();

  await admin
    .from("posts")
    .update({
      title: formValue(formData.get("title")),
      description: formValue(formData.get("description")) || null,
      body: formValue(formData.get("body")) || null,
      post_type: formValue(formData.get("postType")) as PostType,
      required_tier: formValue(formData.get("requiredTier")) as Tier,
      status: formValue(formData.get("status")) as PostStatus
    })
    .eq("id", formValue(formData.get("postId")));

  revalidatePath("/admin/posts");
  revalidatePath("/feed");
}

export async function deletePostAction(formData: FormData) {
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  const postId = formValue(formData.get("postId"));

  const { data: post } = await admin.from("posts").select("thumbnail_path").eq("id", postId).single();
  const { data: media } = await admin.from("post_media").select("storage_path").eq("post_id", postId);

  await removePostStorage([
    ...(post?.thumbnail_path ? [post.thumbnail_path] : []),
    ...((media ?? []).map((item) => item.storage_path))
  ]);

  await admin.from("posts").delete().eq("id", postId);

  revalidatePath("/admin/posts");
  revalidatePath("/feed");
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
  const nextTier = formValue(formData.get("tier")) as Tier;
  const nextAccessStatus = formValue(formData.get("accessStatus")) as AccessStatus;
  const nextBadges = formData
    .getAll("adminBadges")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  const { error } = await admin
    .from("profiles")
    .update({
      display_name: formValue(formData.get("displayName")) || null,
      nickname: formValue(formData.get("nickname")) || null,
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
