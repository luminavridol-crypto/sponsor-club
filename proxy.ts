import { NextResponse, type NextRequest } from "next/server";

const STATIC_FILE_PATTERN = /\.[^/]+$/;
const PUBLIC_BROWSER_PATHS = new Set(["/", "/login", "/invite", "/account", "/open-path/tiers", "/request-access"]);

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-current-pathname", pathname);
  requestHeaders.set(
    "x-local-preview",
    request.nextUrl.hostname === "localhost" || request.nextUrl.hostname === "127.0.0.1" ? "1" : "0"
  );

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  const isApiRoute = pathname.startsWith("/api");
  const isNextAsset = pathname.startsWith("/_next");
  const isStaticFile = STATIC_FILE_PATTERN.test(pathname);

  if (isApiRoute || isNextAsset || isStaticFile) {
    return response;
  }

  if (pathname.startsWith("/tg") || PUBLIC_BROWSER_PATHS.has(pathname)) {
    return response;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/tg";
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"]
};
