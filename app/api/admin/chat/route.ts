import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { cleanupOldChatMessages } from "@/lib/data/chat";
import { cleanupOrphanedStorage } from "@/lib/data/storage-cleanup";
import {
  assertUploadFile,
  getSafeFileExtension,
  getUploadMediaType
} from "@/lib/security/file-uploads";
import { deleteMedia, uploadMediaToR2 } from "@/lib/storage/media";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function formValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function uploadChatFile(file: File, profileId: string) {
  assertUploadFile(file);
  const extension = getSafeFileExtension(file);
  return uploadMediaToR2(file, `chat/${profileId}/${randomUUID()}.${extension}`, file.type);
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Нужно войти в аккаунт." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, access_status")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin" || profile.access_status !== "active") {
      return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
    }

    const formData = await request.formData();
    const admin = createAdminSupabaseClient();
    const profileId = formValue(formData.get("profileId"));
    const body = formValue(formData.get("body"));
    const mediaEntry = formData.get("media");
    const mediaFile =
      mediaEntry instanceof File && mediaEntry.size > 0 ? mediaEntry : null;

    await cleanupOldChatMessages(admin);
    await cleanupOrphanedStorage(admin);

    if (!profileId || (!body && !mediaFile)) {
      return NextResponse.json(
        { error: "Нужно написать сообщение или прикрепить файл." },
        { status: 400 }
      );
    }

    const { data: targetProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", profileId)
      .eq("role", "member")
      .eq("access_status", "active")
      .maybeSingle();

    if (!targetProfile) {
      return NextResponse.json({ error: "Получатель не найден или не активен." }, { status: 400 });
    }

    let mediaPath: string | null = null;
    let mediaType: "image" | "video" | "file" | null = null;
    let uploadedMedia:
      | Awaited<ReturnType<typeof uploadChatFile>>
      | null = null;

    if (mediaFile) {
      if (!mediaFile.type.startsWith("image/") && !mediaFile.type.startsWith("video/")) {
        return NextResponse.json(
          { error: "В чат можно загрузить только фото или видео." },
          { status: 400 }
        );
      }

      uploadedMedia = await uploadChatFile(mediaFile, profileId);
      mediaPath = uploadedMedia.storagePath;
      mediaType = getUploadMediaType(mediaFile);
    }

    const { error } = await admin.from("member_chat_messages").insert({
      profile_id: profileId,
      sender_role: "admin",
      body: body || null,
      media_path: mediaPath,
      media_provider: uploadedMedia?.provider ?? null,
      media_bucket: uploadedMedia?.bucket ?? null,
      media_object_key: uploadedMedia?.objectKey ?? null,
      media_mime_type: uploadedMedia?.contentType ?? null,
      media_size_bytes: uploadedMedia?.sizeBytes ?? null,
      media_type: mediaType,
      read_by_admin_at: new Date().toISOString(),
      read_by_member_at: null
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

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка отправки." },
      { status: 500 }
    );
  }
}
