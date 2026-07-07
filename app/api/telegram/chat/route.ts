import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAnyProfile } from "@/lib/auth/guards";
import { cleanupOldChatMessages } from "@/lib/data/chat";
import { canSendMonthlyChatMessage } from "@/lib/data/chat-limits";
import { assertUploadFile, getSafeFileExtension } from "@/lib/security/file-uploads";
import { assertSameOriginRequest, isInvalidRequestOriginError } from "@/lib/security/request-origin";
import { deleteMedia, uploadMediaToR2 } from "@/lib/storage/media";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function formValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function redirectToChat(request: Request, params: Record<string, string> = {}) {
  const url = new URL("/tg/chat", request.url);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url);
}

async function uploadChatImage(file: File, profileId: string) {
  assertUploadFile(file, { allowImages: true, allowVideos: false });
  const extension = getSafeFileExtension(file);
  return uploadMediaToR2(file, `chat/${profileId}/${randomUUID()}.${extension}`, file.type);
}

export async function POST(request: Request) {
  try {
    await assertSameOriginRequest();
    const profile = await requireAnyProfile();
    const admin = createAdminSupabaseClient();
    const formData = await request.formData();
    const body = formValue(formData.get("body"));
    const mediaEntry = formData.get("media");
    const mediaFile = mediaEntry instanceof File && mediaEntry.size > 0 ? mediaEntry : null;

    await cleanupOldChatMessages(admin);

    if (!body && !mediaFile) {
      return redirectToChat(request, { error: "empty" });
    }

    if (!(await canSendMonthlyChatMessage(admin, profile))) {
      return redirectToChat(request, { error: "limit" });
    }

    let uploadedMedia: Awaited<ReturnType<typeof uploadChatImage>> | null = null;

    if (mediaFile) {
      if (!mediaFile.type.startsWith("image/")) {
        return redirectToChat(request, { error: "image" });
      }

      uploadedMedia = await uploadChatImage(mediaFile, profile.id);
    }

    const { error } = await admin.from("member_chat_messages").insert({
      profile_id: profile.id,
      sender_role: "member",
      body: body || "Вложение",
      media_path: uploadedMedia?.storagePath ?? null,
      media_provider: uploadedMedia?.provider ?? null,
      media_bucket: uploadedMedia?.bucket ?? null,
      media_object_key: uploadedMedia?.objectKey ?? null,
      media_mime_type: uploadedMedia?.contentType ?? null,
      media_size_bytes: uploadedMedia?.sizeBytes ?? null,
      media_type: uploadedMedia ? "image" : null,
      counts_against_monthly_limit: true,
      read_by_admin_at: null,
      read_by_member_at: new Date().toISOString()
    });

    if (error) {
      if (uploadedMedia) {
        await deleteMedia(
          {
            provider: uploadedMedia.provider,
            bucket: uploadedMedia.bucket,
            object_key: uploadedMedia.objectKey,
            storage_path: uploadedMedia.storagePath
          },
          { supabase: admin, legacyBucket: "chat-media" }
        );
      }

      return redirectToChat(request, { error: "send" });
    }

    revalidatePath("/tg/chat");
    revalidatePath("/tg/admin/chat");
    revalidatePath("/tg/admin/users");

    return redirectToChat(request, { sent: "1" });
  } catch (error) {
    if (isInvalidRequestOriginError(error)) {
      return NextResponse.json({ error: "Недопустимый источник запроса." }, { status: 403 });
    }

    return redirectToChat(request, {
      error: error instanceof Error && error.message ? "upload" : "send"
    });
  }
}
