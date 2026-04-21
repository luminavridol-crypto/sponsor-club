import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PostStatus, PostType, Tier } from "@/lib/types";
import { slugify } from "@/lib/utils/slug";

function formValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function calculateExpirationDate(publishAtIso: string, retentionDays: number) {
  const date = new Date(publishAtIso);
  date.setDate(date.getDate() + retentionDays);
  return date.toISOString();
}

function humanizeStorageError(message: string) {
  if (message.includes("The object exceeded the maximum allowed size")) {
    return "Файл слишком большой для текущего лимита в Supabase Storage. Увеличь лимит bucket `post-media`.";
  }

  if (message.includes("Bucket not found")) {
    return "Bucket `post-media` не найден в Supabase Storage.";
  }

  return message;
}

async function uploadFile(file: File, folder: string) {
  const admin = createAdminSupabaseClient();
  const extension = file.name.split(".").pop() || "bin";
  const fileName = `${folder}/${randomUUID()}.${extension}`;
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await admin.storage
    .from("post-media")
    .upload(fileName, Buffer.from(arrayBuffer), {
      contentType: file.type || undefined,
      upsert: false
    });

  if (error) {
    throw new Error(humanizeStorageError(error.message));
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
    const title = formValue(formData.get("title"));
    const retentionDaysRaw = Number(formValue(formData.get("retentionDays")) || 0);

    if (!title) {
      return NextResponse.json({ error: "Название обязательно." }, { status: 400 });
    }

    const publishAt = formValue(formData.get("publishAt"))
      ? new Date(formValue(formData.get("publishAt"))).toISOString()
      : new Date().toISOString();
    const retentionDays =
      retentionDaysRaw === 30 || retentionDaysRaw === 60 || retentionDaysRaw === 90
        ? retentionDaysRaw
        : 0;
    const expiresAt = retentionDays ? calculateExpirationDate(publishAt, retentionDays) : null;

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
        publish_at: publishAt,
        retention_days: retentionDays || null,
        expires_at: expiresAt,
        thumbnail_path: thumbnailPath,
        author_id: profile.id
      })
      .select("id")
      .single();

    if (error || !post) {
      return NextResponse.json(
        { error: error?.message || "Не удалось создать пост." },
        { status: 500 }
      );
    }

    for (const [index, file] of mediaFiles.entries()) {
      const storagePath = await uploadFile(file, `posts/${post.id}`);
      const mediaType = file.type.startsWith("video/") ? "video" : "image";

      const { error: mediaError } = await admin.from("post_media").insert({
        post_id: post.id,
        storage_path: storagePath,
        media_type: mediaType,
        sort_order: index
      });

      if (mediaError) {
        return NextResponse.json(
          { error: humanizeStorageError(mediaError.message) },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? humanizeStorageError(error.message) : "Ошибка загрузки."
      },
      { status: 500 }
    );
  }
}
