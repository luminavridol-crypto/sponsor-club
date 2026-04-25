import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SupabaseClient } from "@supabase/supabase-js";
import { getR2Env } from "@/lib/r2/env";

export const R2_PROVIDER = "r2";
export const LEGACY_SUPABASE_PROVIDER = "supabase";
export const R2_STORAGE_PREFIX = "r2:";

export type MediaProvider = typeof R2_PROVIDER | typeof LEGACY_SUPABASE_PROVIDER;
export type MediaRecord = {
  provider?: string | null;
  storage_provider?: string | null;
  bucket?: string | null;
  storage_bucket?: string | null;
  object_key?: string | null;
  storage_object_key?: string | null;
  path?: string | null;
  storage_path?: string | null;
  thumbnail_path?: string | null;
};

export type R2MediaObject = {
  provider: typeof R2_PROVIDER;
  bucket: string;
  objectKey: string;
  storagePath: string;
  sizeBytes: number | null;
  contentType: string | null;
  lastModified: Date | null;
};

let cachedClient: S3Client | null = null;

function getR2Client() {
  if (cachedClient) {
    return cachedClient;
  }

  const { endpoint, accessKeyId, secretAccessKey } = getR2Env();

  cachedClient = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  return cachedClient;
}

export function toR2ObjectKey(pathOrKey: string) {
  return pathOrKey.startsWith(R2_STORAGE_PREFIX)
    ? pathOrKey.slice(R2_STORAGE_PREFIX.length)
    : pathOrKey;
}

export function toR2StoragePath(key: string) {
  return `${R2_STORAGE_PREFIX}${key}`;
}

export function isR2StoragePath(path: string | null | undefined) {
  return Boolean(path?.startsWith(R2_STORAGE_PREFIX));
}

export function getMediaProvider(record: MediaRecord): MediaProvider {
  const provider = record.provider ?? record.storage_provider;

  if (provider === R2_PROVIDER || isR2StoragePath(getMediaStoragePath(record))) {
    return R2_PROVIDER;
  }

  return LEGACY_SUPABASE_PROVIDER;
}

export function getMediaStoragePath(record: MediaRecord) {
  return record.path ?? record.storage_path ?? record.thumbnail_path ?? null;
}

export function getMediaObjectKey(record: MediaRecord) {
  const objectKey = record.object_key ?? record.storage_object_key;

  if (objectKey) {
    return objectKey;
  }

  const path = getMediaStoragePath(record);
  return path ? toR2ObjectKey(path) : null;
}

export function getMediaBucket(record: MediaRecord, fallback = "post-media") {
  return record.bucket ?? record.storage_bucket ?? fallback;
}

export async function uploadMediaToR2(
  fileOrBuffer: File | Buffer | Uint8Array | ArrayBuffer,
  key: string,
  contentType = "application/octet-stream"
) {
  const body =
    fileOrBuffer instanceof File
      ? Buffer.from(await fileOrBuffer.arrayBuffer())
      : fileOrBuffer instanceof ArrayBuffer
        ? Buffer.from(fileOrBuffer)
        : Buffer.from(fileOrBuffer);
  const client = getR2Client();
  const { bucketName } = getR2Env();

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
      ContentDisposition: "inline"
    })
  );

  return {
    provider: R2_PROVIDER,
    bucket: bucketName,
    objectKey: key,
    storagePath: toR2StoragePath(key),
    sizeBytes: body.byteLength,
    contentType: contentType || "application/octet-stream"
  };
}

export async function createR2SignedUploadUrl(
  key: string,
  contentType = "application/octet-stream",
  expiresIn = 60 * 10
) {
  const client = getR2Client();
  const { bucketName } = getR2Env();

  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType || "application/octet-stream",
      ContentDisposition: "inline"
    }),
    {
      expiresIn,
      signableHeaders: new Set(["content-type"])
    }
  );
}

export async function getR2SignedReadUrl(key: string, expiresIn = 60 * 60) {
  const client = getR2Client();
  const { bucketName } = getR2Env();

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: toR2ObjectKey(key),
      ResponseContentDisposition: "inline"
    }),
    { expiresIn }
  );
}

export async function deleteR2Object(key: string) {
  const client = getR2Client();
  const { bucketName } = getR2Env();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: toR2ObjectKey(key)
    })
  );
}

export async function listR2Media(prefix = ""): Promise<R2MediaObject[]> {
  const client = getR2Client();
  const { bucketName } = getR2Env();
  const media: R2MediaObject[] = [];
  let continuationToken: string | undefined;

  do {
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix || undefined,
        ContinuationToken: continuationToken
      })
    );

    for (const object of result.Contents ?? []) {
      if (!object.Key) {
        continue;
      }

      let contentType: string | null = null;

      try {
        const head = await client.send(
          new HeadObjectCommand({
            Bucket: bucketName,
            Key: object.Key
          })
        );
        contentType = head.ContentType ?? null;
      } catch {
        contentType = null;
      }

      media.push({
        provider: R2_PROVIDER,
        bucket: bucketName,
        objectKey: object.Key,
        storagePath: toR2StoragePath(object.Key),
        sizeBytes: object.Size ?? null,
        contentType,
        lastModified: object.LastModified ?? null
      });
    }

    continuationToken = result.NextContinuationToken;
  } while (continuationToken);

  return media;
}

export async function getMediaUrl(
  mediaRecord: MediaRecord,
  {
    supabase,
    legacyBucket = "post-media",
    expiresIn = 60 * 60
  }: {
    supabase?: SupabaseClient;
    legacyBucket?: string;
    expiresIn?: number;
  } = {}
) {
  const provider = getMediaProvider(mediaRecord);
  const objectKey = getMediaObjectKey(mediaRecord);

  if (!objectKey) {
    return null;
  }

  if (provider === R2_PROVIDER) {
    return getR2SignedReadUrl(objectKey, expiresIn);
  }

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(getMediaBucket(mediaRecord, legacyBucket))
    .createSignedUrl(objectKey, expiresIn);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

export async function deleteMedia(
  mediaRecord: MediaRecord,
  {
    supabase,
    legacyBucket = "post-media"
  }: {
    supabase?: SupabaseClient;
    legacyBucket?: string;
  } = {}
) {
  const provider = getMediaProvider(mediaRecord);
  const objectKey = getMediaObjectKey(mediaRecord);

  if (!objectKey) {
    return;
  }

  if (provider === R2_PROVIDER) {
    await deleteR2Object(objectKey);
    return;
  }

  if (!supabase) {
    return;
  }

  await supabase.storage.from(getMediaBucket(mediaRecord, legacyBucket)).remove([objectKey]);
}
