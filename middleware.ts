import { NextResponse, type NextRequest } from "next/server";
const STATIC_FILE_PATTERN = /\.[^/]+$/;

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-current-pathname", pathname);

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

  if (pathname.startsWith("/tg")) {
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
