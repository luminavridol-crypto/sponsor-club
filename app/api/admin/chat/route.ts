import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { cleanupOldChatMessages } from "@/lib/data/chat";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function formValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function uploadChatFile(file: File, profileId: string) {
  const admin = createAdminSupabaseClient();
  const extension = file.name.split(".").pop() || "bin";
  const fileName = `${profileId}/${randomUUID()}.${extension}`;
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await admin.storage
    .from("chat-media")
    .upload(fileName, Buffer.from(arrayBuffer), {
      contentType: file.type || undefined,
      upsert: false
    });

  if (error) {
    throw new Error(error.message);
  }

  return fileName;
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

    if (!profileId || (!body && !mediaFile)) {
      return NextResponse.json(
        { error: "Нужно написать сообщение или прикрепить файл." },
        { status: 400 }
      );
    }

    let mediaPath: string | null = null;
    let mediaType: "image" | "video" | null = null;

    if (mediaFile) {
      if (!mediaFile.type.startsWith("image/") && !mediaFile.type.startsWith("video/")) {
        return NextResponse.json(
          { error: "В чат можно загрузить только фото или видео." },
          { status: 400 }
        );
      }

      mediaPath = await uploadChatFile(mediaFile, profileId);
      mediaType = mediaFile.type.startsWith("video/") ? "video" : "image";
    }

    const { error } = await admin.from("member_chat_messages").insert({
      profile_id: profileId,
      sender_role: "admin",
      body: body || null,
      media_path: mediaPath,
      media_type: mediaType,
      read_by_admin_at: new Date().toISOString(),
      read_by_member_at: null
    });

    if (error) {
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
