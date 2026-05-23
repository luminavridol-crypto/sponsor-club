import { createHmac, timingSafeEqual } from "crypto";

type UploadWorkerTokenPayload = {
  objectKey: string;
  uploadId?: string;
  exp: number;
};

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function getUploadWorkerEnv() {
  const publicUrl = process.env.NEXT_PUBLIC_UPLOAD_WORKER_URL?.trim().replace(/\/$/, "") || "";
  const tokenSecret = process.env.UPLOAD_WORKER_TOKEN_SECRET?.trim() || "";

  return {
    publicUrl,
    tokenSecret,
    enabled: Boolean(publicUrl && tokenSecret)
  };
}

export function createUploadWorkerToken(
  payload: UploadWorkerTokenPayload,
  secret: string
) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyUploadWorkerToken(
  token: string,
  secret: string
): UploadWorkerTokenPayload {
  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    throw new Error("Invalid upload worker token.");
  }

  const expectedSignature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  const valid = timingSafeEqual(
    Buffer.from(providedSignature, "utf8"),
    Buffer.from(expectedSignature, "utf8")
  );

  if (!valid) {
    throw new Error("Upload worker token signature mismatch.");
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload)) as UploadWorkerTokenPayload;

  if (!payload.objectKey || !payload.exp) {
    throw new Error("Upload worker token payload is incomplete.");
  }

  if (payload.exp * 1000 < Date.now()) {
    throw new Error("Upload worker token expired.");
  }

  return payload;
}
