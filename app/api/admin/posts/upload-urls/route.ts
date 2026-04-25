import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Env } from "@/lib/r2/env";
import { assertUploadFile, getSafeFileExtension, getUploadMediaType } from "@/lib/security/file-uploads";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type UploadRequestItem = {
  fileName: string;
  contentType: string;
  kind: "thumbnail" | "media";
};

type UploadResponseItem = {
  fileName: string;
  contentType: string;
  kind: "thumbnail" | "media";
  mediaType: "image" | "video";
  storagePath: string;
  uploadMethod: "supabase" | "r2";
  token?: string;
  signedUrl?: string;
  uploadPath?: string;
};

function createR2Client() {
  const { endpoint, accessKeyId, secretAccessKey } = getR2Env();

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

function asFile(metadata: UploadRequestItem) {
  return {
    name: metadata.fileName,
    type: metadata.contentType,
    size: 0
  } as File;
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

    const body = (await request.json()) as { files?: UploadRequestItem[] };
    const files = Array.isArray(body.files) ? body.files : [];

    if (!files.length) {
      return NextResponse.json({ items: [] });
    }

    const admin = createAdminSupabaseClient();
    const r2 = createR2Client();
    const { bucketName } = getR2Env();
    const items: UploadResponseItem[] = [];

    for (const file of files) {
      const fileLike = asFile(file);
      const mediaType =
        file.kind === "thumbnail"
          ? assertUploadFile(fileLike, { allowImages: true, allowVideos: false })
          : assertUploadFile(fileLike);
      const extension = getSafeFileExtension(fileLike);

      if (file.kind === "thumbnail" || mediaType === "image") {
        const uploadPath =
          file.kind === "thumbnail"
            ? `thumbnails/${randomUUID()}.${extension}`
            : `posts/pending/${randomUUID()}.${extension}`;
        const { data, error } = await admin.storage
          .from("post-media")
          .createSignedUploadUrl(uploadPath);

        if (error || !data) {
          return NextResponse.json({ error: error?.message || "Не удалось подготовить загрузку." }, { status: 500 });
        }

        items.push({
          ...file,
          mediaType,
          storagePath: uploadPath,
          uploadMethod: "supabase",
          token: data.token,
          uploadPath
        });
        continue;
      }

      const key = `posts/pending/${randomUUID()}.${extension}`;
      const signedUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          ContentType: file.contentType
        }),
        {
          expiresIn: 60 * 10,
          signableHeaders: new Set(["content-type"])
        }
      );

      items.push({
        ...file,
        mediaType,
        storagePath: `r2:${key}`,
        uploadMethod: "r2",
        signedUrl
      });
    }

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка подготовки загрузки." },
      { status: 500 }
    );
  }
}
