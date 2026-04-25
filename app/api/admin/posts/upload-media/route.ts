import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getR2Env } from "@/lib/r2/env";
import {
  assertUploadFile,
  getSafeFileExtension
} from "@/lib/security/file-uploads";
import { toR2StoragePath, uploadMediaToR2 } from "@/lib/storage/media";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
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
    const file = formData.get("file");
    const kind = formValue(formData.get("kind")) || "media";

    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "Файл не найден." }, { status: 400 });
    }

    const mediaType =
      kind === "thumbnail"
        ? assertUploadFile(file, { allowImages: true, allowVideos: false })
        : assertUploadFile(file);
    const extension = getSafeFileExtension(file);
    const key =
      kind === "thumbnail"
        ? `thumbnails/${randomUUID()}.${extension}`
        : `posts/pending/${randomUUID()}.${extension}`;
    const contentType = file.type || "application/octet-stream";
    const uploaded = await uploadMediaToR2(file, key, contentType);
    const { bucketName } = getR2Env();

    return NextResponse.json({
      provider: "r2",
      bucket: uploaded.bucket || bucketName,
      object_key: uploaded.objectKey,
      storage_path: toR2StoragePath(uploaded.objectKey),
      mime_type: uploaded.contentType,
      size_bytes: uploaded.sizeBytes,
      media_type: mediaType
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ошибка загрузки файла."
      },
      { status: 500 }
    );
  }
}
