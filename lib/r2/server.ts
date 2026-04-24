import { randomUUID } from "crypto";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Env } from "@/lib/r2/env";
import { assertUploadFile, getSafeFileExtension } from "@/lib/security/file-uploads";

const R2_PREFIX = "r2:";

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

function toR2Key(path: string) {
  return path.slice(R2_PREFIX.length);
}

function toR2StoragePath(key: string) {
  return `${R2_PREFIX}${key}`;
}

export function isR2StoragePath(path: string) {
  return path.startsWith(R2_PREFIX);
}

export async function uploadVideoToR2(file: File, folder: string) {
  assertUploadFile(file, { allowImages: false, allowVideos: true });
  const client = getR2Client();
  const { bucketName } = getR2Env();
  const extension = getSafeFileExtension(file);
  const key = `${folder}/${randomUUID()}.${extension}`;
  const arrayBuffer = await file.arrayBuffer();

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type || "application/octet-stream",
      ContentDisposition: "inline"
    })
  );

  return toR2StoragePath(key);
}

export async function listR2StoragePaths(prefix = "posts/") {
  const client = getR2Client();
  const { bucketName } = getR2Env();
  const paths: string[] = [];
  let continuationToken: string | undefined;

  do {
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken
      })
    );

    for (const object of result.Contents ?? []) {
      if (object.Key) {
        paths.push(toR2StoragePath(object.Key));
      }
    }

    continuationToken = result.NextContinuationToken;
  } while (continuationToken);

  return paths;
}

export async function getSignedR2Urls(paths: string[], expiresIn = 60 * 60) {
  const client = getR2Client();
  const { bucketName } = getR2Env();

  const entries = await Promise.all(
    paths.filter(isR2StoragePath).map(async (path) => {
      const signedUrl = await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: bucketName,
          Key: toR2Key(path),
          ResponseContentDisposition: "inline"
        }),
        { expiresIn }
      );

      return [path, signedUrl] as const;
    })
  );

  return Object.fromEntries(entries);
}

export async function deleteR2Objects(paths: string[]) {
  const keys = paths.filter(isR2StoragePath).map(toR2Key);

  if (!keys.length) {
    return;
  }

  const client = getR2Client();
  const { bucketName } = getR2Env();

  await client.send(
    new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: keys.map((Key) => ({ Key })),
        Quiet: true
      }
    })
  );
}
