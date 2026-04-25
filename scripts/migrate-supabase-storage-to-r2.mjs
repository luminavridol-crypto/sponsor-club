import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const mode = process.argv[2] ?? "dry-run";
const validModes = new Set(["dry-run", "migrate", "cleanup"]);

if (!validModes.has(mode)) {
  console.error("Usage: node scripts/migrate-supabase-storage-to-r2.mjs [dry-run|migrate|cleanup]");
  process.exit(1);
}

loadEnvFile(".env.local");

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "R2_ENDPOINT",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME"
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT.replace(/\/$/, ""),
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

function loadEnvFile(fileName) {
  const envPath = path.resolve(fileName);
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function contentTypeForPath(storagePath, fallback = "application/octet-stream") {
  const extension = storagePath.split(".").pop()?.toLowerCase();
  const byExtension = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime"
  };

  return byExtension[extension] ?? fallback;
}

function r2PathFor(bucket, storagePath) {
  return `legacy/${bucket}/${storagePath}`;
}

async function collectRecords() {
  const [postsResult, postMediaResult, chatMessagesResult] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, thumbnail_path, thumbnail_provider, thumbnail_legacy_path")
      .not("thumbnail_path", "is", null),
    supabase
      .from("post_media")
      .select("id, post_id, storage_path, storage_provider, legacy_storage_path, media_type"),
    supabase
      .from("member_chat_messages")
      .select("id, media_path, media_provider, media_legacy_path, media_type")
      .not("media_path", "is", null)
  ]);

  for (const result of [postsResult, postMediaResult, chatMessagesResult]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const posts = postsResult.data;
  const postMedia = postMediaResult.data;
  const chatMessages = chatMessagesResult.data;

  const records = [];

  for (const post of posts ?? []) {
    if (post.thumbnail_provider === "r2" || post.thumbnail_path?.startsWith("r2:")) continue;
    records.push({
      table: "posts",
      id: post.id,
      label: post.title,
      bucket: "post-media",
      legacyPath: post.thumbnail_path,
      mediaType: "image",
      field: "thumbnail"
    });
  }

  for (const item of postMedia ?? []) {
    if (item.storage_provider === "r2" || item.storage_path?.startsWith("r2:")) continue;
    records.push({
      table: "post_media",
      id: item.id,
      label: item.post_id,
      bucket: "post-media",
      legacyPath: item.storage_path,
      mediaType: item.media_type,
      field: "media"
    });
  }

  for (const message of chatMessages ?? []) {
    if (message.media_provider === "r2" || message.media_path?.startsWith("r2:")) continue;
    records.push({
      table: "member_chat_messages",
      id: message.id,
      label: message.id,
      bucket: "chat-media",
      legacyPath: message.media_path,
      mediaType: message.media_type,
      field: "chat"
    });
  }

  return records;
}

async function migrateRecord(record) {
  const { data, error } = await supabase.storage.from(record.bucket).download(record.legacyPath);
  if (error || !data) {
    throw new Error(`download failed: ${error?.message ?? record.legacyPath}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  const body = Buffer.from(arrayBuffer);
  const contentType = data.type || contentTypeForPath(record.legacyPath);
  const objectKey = r2PathFor(record.bucket, record.legacyPath);
  const storagePath = `r2:${objectKey}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
      Body: body,
      ContentType: contentType,
      ContentDisposition: "inline"
    })
  );

  if (record.table === "posts") {
    await supabase
      .from("posts")
      .update({
        thumbnail_path: storagePath,
        thumbnail_provider: "r2",
        thumbnail_bucket: process.env.R2_BUCKET_NAME,
        thumbnail_object_key: objectKey,
        thumbnail_mime_type: contentType,
        thumbnail_size_bytes: body.byteLength,
        thumbnail_legacy_path: record.legacyPath
      })
      .eq("id", record.id);
  }

  if (record.table === "post_media") {
    await supabase
      .from("post_media")
      .update({
        storage_path: storagePath,
        storage_provider: "r2",
        storage_bucket: process.env.R2_BUCKET_NAME,
        storage_object_key: objectKey,
        mime_type: contentType,
        size_bytes: body.byteLength,
        legacy_storage_path: record.legacyPath
      })
      .eq("id", record.id);
  }

  if (record.table === "member_chat_messages") {
    await supabase
      .from("member_chat_messages")
      .update({
        media_path: storagePath,
        media_provider: "r2",
        media_bucket: process.env.R2_BUCKET_NAME,
        media_object_key: objectKey,
        media_mime_type: contentType,
        media_size_bytes: body.byteLength,
        media_legacy_path: record.legacyPath
      })
      .eq("id", record.id);
  }

  return { ...record, objectKey, storagePath, contentType, sizeBytes: body.byteLength };
}

async function collectCleanupRecords() {
  const [postsResult, postMediaResult, chatMessagesResult] = await Promise.all([
    supabase
      .from("posts")
      .select("id, thumbnail_legacy_path")
      .eq("thumbnail_provider", "r2")
      .not("thumbnail_legacy_path", "is", null),
    supabase
      .from("post_media")
      .select("id, legacy_storage_path")
      .eq("storage_provider", "r2")
      .not("legacy_storage_path", "is", null),
    supabase
      .from("member_chat_messages")
      .select("id, media_legacy_path")
      .eq("media_provider", "r2")
      .not("media_legacy_path", "is", null)
  ]);

  for (const result of [postsResult, postMediaResult, chatMessagesResult]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const posts = postsResult.data;
  const postMedia = postMediaResult.data;
  const chatMessages = chatMessagesResult.data;

  return [
    ...((posts ?? []).map((item) => ({
      table: "posts",
      id: item.id,
      bucket: "post-media",
      legacyPath: item.thumbnail_legacy_path,
      clearColumn: "thumbnail_legacy_path"
    }))),
    ...((postMedia ?? []).map((item) => ({
      table: "post_media",
      id: item.id,
      bucket: "post-media",
      legacyPath: item.legacy_storage_path,
      clearColumn: "legacy_storage_path"
    }))),
    ...((chatMessages ?? []).map((item) => ({
      table: "member_chat_messages",
      id: item.id,
      bucket: "chat-media",
      legacyPath: item.media_legacy_path,
      clearColumn: "media_legacy_path"
    })))
  ];
}

async function main() {
  if (mode === "cleanup") {
    const records = await collectCleanupRecords();
    console.log(`cleanup candidates: ${records.length}`);
    for (const record of records) {
      console.log(`${record.bucket}/${record.legacyPath} from ${record.table}:${record.id}`);
    }

    if (process.env.CONFIRM_R2_CLEANUP !== "yes") {
      console.log("cleanup skipped. Set CONFIRM_R2_CLEANUP=yes only after manual verification.");
      return;
    }

    for (const record of records) {
      const { error } = await supabase.storage.from(record.bucket).remove([record.legacyPath]);
      if (error) {
        console.error(`cleanup failed ${record.bucket}/${record.legacyPath}: ${error.message}`);
        continue;
      }
      await supabase.from(record.table).update({ [record.clearColumn]: null }).eq("id", record.id);
      console.log(`removed ${record.bucket}/${record.legacyPath}`);
    }
    return;
  }

  const records = await collectRecords();
  console.log(`migration candidates: ${records.length}`);
  for (const record of records) {
    console.log(`${record.table}:${record.id} ${record.bucket}/${record.legacyPath}`);
  }

  if (mode === "dry-run") {
    console.log("dry-run only. No files or database rows were changed.");
    return;
  }

  for (const record of records) {
    try {
      const migrated = await migrateRecord(record);
      console.log(
        `migrated ${record.bucket}/${record.legacyPath} -> ${migrated.storagePath} (${migrated.contentType}, ${migrated.sizeBytes} bytes)`
      );
    } catch (error) {
      console.error(
        `failed ${record.bucket}/${record.legacyPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
