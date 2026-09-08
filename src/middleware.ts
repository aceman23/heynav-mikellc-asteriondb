import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Same intent as vm-manager/src/middleware.ts, reading the cookie straight
// off the request so this stays on the Edge runtime.
const SESSION_COOKIE = "heynav.session";
const PROTECTED_PREFIXES = ["/workspace"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  console.log(`[middleware] ${pathname} — session: ${hasSession ? "present" : "none"}`);

  if ("/" === pathname) {
    return NextResponse.redirect(new URL(hasSession ? "/workspace" : "/login", request.url));
  }

  if ("/login" === pathname && hasSession) {
    return NextResponse.redirect(new URL("/workspace", request.url));
  }

  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)"],
};
