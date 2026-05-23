type Env = {
  UPLOADS: R2Bucket;
  UPLOAD_WORKER_TOKEN_SECRET: string;
  UPLOAD_WORKER_ALLOWED_ORIGINS?: string;
};

type UploadWorkerTokenPayload = {
  objectKey: string;
  uploadId: string;
  exp: number;
};

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers || {})
    }
  });
}

function getAllowedOrigin(request: Request, env: Env) {
  const origin = request.headers.get("origin") || "";
  const allowed = (env.UPLOAD_WORKER_ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return allowed.includes(origin) ? origin : allowed[0] || "*";
}

function withCors(request: Request, env: Env, response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", getAllowedOrigin(request, env));
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return atob(padded);
}

async function verifyToken(token: string, secret: string): Promise<UploadWorkerTokenPayload> {
  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    throw new Error("Invalid worker token.");
  }

  const expectedSignature = await sign(encodedPayload, secret);

  if (expectedSignature !== providedSignature) {
    throw new Error("Worker token signature mismatch.");
  }

  const payload = JSON.parse(decodeBase64Url(encodedPayload)) as UploadWorkerTokenPayload;

  if (!payload.objectKey || !payload.uploadId || !payload.exp) {
    throw new Error("Worker token payload is incomplete.");
  }

  if (payload.exp * 1000 < Date.now()) {
    throw new Error("Worker token expired.");
  }

  return payload;
}

const worker = {
  async fetch(request: Request, env: Env) {
    if (request.method === "OPTIONS") {
      return withCors(request, env, new Response(null, { status: 204 }));
    }

    try {
      const url = new URL(request.url);

      if (request.method !== "POST" || url.pathname !== "/multipart/part") {
        return withCors(request, env, json({ error: "Not found." }, { status: 404 }));
      }

      const authHeader = request.headers.get("authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

      if (!token) {
        return withCors(request, env, json({ error: "Missing worker token." }, { status: 401 }));
      }

      const tokenPayload = await verifyToken(token, env.UPLOAD_WORKER_TOKEN_SECRET);
      const formData = await request.formData();
      const uploadId = String(formData.get("uploadId") || "").trim();
      const objectKey = String(formData.get("objectKey") || "").trim();
      const partNumber = Number(String(formData.get("partNumber") || "0"));
      const chunk = formData.get("chunk");

      if (
        !uploadId ||
        !objectKey ||
        partNumber <= 0 ||
        !(chunk instanceof File) ||
        chunk.size <= 0
      ) {
        return withCors(request, env, json({ error: "Invalid upload chunk." }, { status: 400 }));
      }

      if (tokenPayload.uploadId !== uploadId || tokenPayload.objectKey !== objectKey) {
        return withCors(request, env, json({ error: "Upload token does not match payload." }, { status: 403 }));
      }

      const upload = env.UPLOADS.resumeMultipartUpload(objectKey, uploadId);
      const etag = await upload.uploadPart(partNumber, await chunk.arrayBuffer());

      return withCors(
        request,
        env,
        json({
          ok: true,
          etag,
          part_number: partNumber
        })
      );
    } catch (error) {
      return withCors(
        request,
        env,
        json(
          {
            error: error instanceof Error ? error.message : "Upload worker error."
          },
          { status: 500 }
        )
      );
    }
  }
};

export default worker;
