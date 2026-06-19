import { headers } from "next/headers";

const INVALID_REQUEST_ORIGIN_MESSAGE = "Invalid request origin.";

function getExpectedOrigin(headerStore: Headers) {
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");

  if (!host) {
    return null;
  }

  const forwardedProto = headerStore.get("x-forwarded-proto");
  const protocol =
    forwardedProto ?? (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${protocol}://${host}`;
}

function getRequestOrigin(headerStore: Headers) {
  const origin = headerStore.get("origin");

  if (origin) {
    return origin;
  }

  const referer = headerStore.get("referer");

  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export async function assertSameOriginRequest() {
  const headerStore = await headers();
  const expectedOrigin = getExpectedOrigin(headerStore);
  const requestOrigin = getRequestOrigin(headerStore);

  if (!expectedOrigin || !requestOrigin || expectedOrigin !== requestOrigin) {
    throw new Error(INVALID_REQUEST_ORIGIN_MESSAGE);
  }
}

export function isInvalidRequestOriginError(error: unknown) {
  return error instanceof Error && error.message === INVALID_REQUEST_ORIGIN_MESSAGE;
}
