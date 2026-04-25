export function getR2Env() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucketName = process.env.R2_BUCKET_NAME;
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  const customDomain = process.env.R2_CUSTOM_DOMAIN;

  if (!bucketName || !endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing Cloudflare R2 environment variables.");
  }

  return {
    accountId,
    bucketName,
    endpoint: endpoint.replace(/\/$/, ""),
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: publicBaseUrl?.replace(/\/$/, ""),
    customDomain: customDomain?.replace(/\/$/, "")
  };
}
