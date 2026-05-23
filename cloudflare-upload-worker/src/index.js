function json(data, init) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers || {})
    }
  });
}

function getAllowedOrigin(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = (env.UPLOAD_WORKER_ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return allowed.includes(origin) ? origin : allowed[0] || "*";
}

function withCors(request, env, response) {
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

async function sign(value, secret) {
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

function encodeBase64Url(value) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return atob(padded);
}

async function createToken(payload, secret) {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = await sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

async function verifyToken(token, secret) {
  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    throw new Error("Invalid worker token.");
  }

  const expectedSignature = await sign(encodedPayload, secret);

  if (expectedSignature !== providedSignature) {
    throw new Error("Worker token signature mismatch.");
  }

  const payload = JSON.parse(decodeBase64Url(encodedPayload));

  if (!payload.objectKey || !payload.exp) {
    throw new Error("Worker token payload is incomplete.");
  }

  if (payload.exp * 1000 < Date.now()) {
    throw new Error("Worker token expired.");
  }

  return payload;
}

function requireBearerToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    throw new Error("Missing worker token.");
  }

  return token;
}

function parsePositiveInt(value) {
  const parsed = Number(String(value ?? "0"));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function validateObjectKey(objectKey, tokenPayload) {
  if (!objectKey || tokenPayload.objectKey !== objectKey) {
    throw new Error("Upload token does not match object key.");
  }
}

function validateUploadId(uploadId, tokenPayload) {
  if (!uploadId || !tokenPayload.uploadId || tokenPayload.uploadId !== uploadId) {
    throw new Error("Upload token does not match upload session.");
  }
}

function parseParts(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Uploaded parts are required.");
  }

  const seen = new Set();
  const parts = value.map((part) => {
    const partNumber = parsePositiveInt(part?.partNumber);
    const etag = typeof part?.etag === "string" ? part.etag.trim() : "";

    if (!partNumber || !etag) {
      throw new Error("Uploaded parts payload is invalid.");
    }

    if (seen.has(partNumber)) {
      throw new Error(`Duplicate part number ${partNumber} detected.`);
    }

    seen.add(partNumber);
    return { etag, partNumber };
  });

  return parts.sort((left, right) => left.partNumber - right.partNumber);
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON body.");
  }
}

const worker = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return withCors(request, env, new Response(null, { status: 204 }));
    }

    try {
      const url = new URL(request.url);

      if (request.method !== "POST") {
        return withCors(request, env, json({ error: "Method not allowed." }, { status: 405 }));
      }

      const token = requireBearerToken(request);
      const tokenPayload = await verifyToken(token, env.UPLOAD_WORKER_TOKEN_SECRET);

      if (url.pathname === "/multipart/create") {
        const body = await readJsonBody(request);
        const objectKey = String(body.objectKey || "").trim();

        validateObjectKey(objectKey, tokenPayload);

        const multipartUpload = await env.UPLOADS.createMultipartUpload(objectKey);
        const workerToken = await createToken(
          {
            objectKey,
            uploadId: multipartUpload.uploadId,
            exp: Math.floor(Date.now() / 1000) + 60 * 30
          },
          env.UPLOAD_WORKER_TOKEN_SECRET
        );

        return withCors(
          request,
          env,
          json({
            ok: true,
            objectKey,
            uploadId: multipartUpload.uploadId,
            workerToken
          })
        );
      }

      if (url.pathname === "/multipart/part") {
        const formData = await request.formData();
        const uploadId = String(formData.get("uploadId") || "").trim();
        const objectKey = String(formData.get("objectKey") || "").trim();
        const partNumber = parsePositiveInt(formData.get("partNumber"));
        const chunk = formData.get("chunk");

        validateObjectKey(objectKey, tokenPayload);
        validateUploadId(uploadId, tokenPayload);

        if (!(chunk instanceof File) || chunk.size <= 0 || !partNumber) {
          return withCors(request, env, json({ error: "Invalid upload chunk." }, { status: 400 }));
        }

        const upload = env.UPLOADS.resumeMultipartUpload(objectKey, uploadId);
        const uploadedPart = await upload.uploadPart(partNumber, chunk);

        return withCors(
          request,
          env,
          json({
            ok: true,
            etag: uploadedPart.etag,
            part_number: uploadedPart.partNumber
          })
        );
      }

      if (url.pathname === "/multipart/complete") {
        const body = await readJsonBody(request);
        const uploadId = String(body.uploadId || "").trim();
        const objectKey = String(body.objectKey || "").trim();
        const parts = parseParts(body.parts);

        validateObjectKey(objectKey, tokenPayload);
        validateUploadId(uploadId, tokenPayload);

        const upload = env.UPLOADS.resumeMultipartUpload(objectKey, uploadId);
        const object = await upload.complete(parts);

        return withCors(
          request,
          env,
          json({
            ok: true,
            objectKey,
            uploadId,
            etag: object.httpEtag
          })
        );
      }

      if (url.pathname === "/multipart/abort") {
        const body = await readJsonBody(request);
        const uploadId = String(body.uploadId || "").trim();
        const objectKey = String(body.objectKey || "").trim();

        validateObjectKey(objectKey, tokenPayload);
        validateUploadId(uploadId, tokenPayload);

        const upload = env.UPLOADS.resumeMultipartUpload(objectKey, uploadId);
        await upload.abort();

        return withCors(
          request,
          env,
          json({
            ok: true,
            objectKey,
            uploadId
          })
        );
      }

      return withCors(request, env, json({ error: "Not found." }, { status: 404 }));
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
