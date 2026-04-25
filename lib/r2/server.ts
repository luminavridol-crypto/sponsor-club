import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client
} from "@aws-sdk/client-s3";
import { getR2Env } from "@/lib/r2/env";
import {
  getR2SignedReadUrl,
  isR2StoragePath,
  toR2ObjectKey,
  toR2StoragePath
} from "@/lib/storage/media";

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

export { isR2StoragePath };

export async function listR2StoragePaths(prefix = "") {
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

export async function getR2StorageUsage(prefix = "") {
  const client = getR2Client();
  const { bucketName } = getR2Env();
  let totalBytes = 0;
  let fileCount = 0;
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
        fileCount += 1;
        totalBytes += object.Size ?? 0;
      }
    }

    continuationToken = result.NextContinuationToken;
  } while (continuationToken);

  return {
    fileCount,
    totalBytes
  };
}

export async function getSignedR2Urls(paths: string[], expiresIn = 60 * 60) {
  const entries = await Promise.all(
    paths.filter(isR2StoragePath).map(async (path) => {
      const signedUrl = await getR2SignedReadUrl(toR2ObjectKey(path), expiresIn);

      return [path, signedUrl] as const;
    })
  );

  return Object.fromEntries(entries);
}

export async function deleteR2Objects(paths: string[]) {
  const keys = paths.filter(isR2StoragePath).map(toR2ObjectKey);

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
