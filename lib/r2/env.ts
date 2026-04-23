export function getR2Env() {
  const bucketName = process.env.R2_BUCKET_NAME;
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!bucketName || !endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing Cloudflare R2 environment variables.");
  }

  return {
    bucketName,
    endpoint: endpoint.replace(/\/$/, ""),
    accessKeyId,
    secretAccessKey
  };
}
