// FILE: proxy.ts
// -----------------------------------------------------------------------------
// Two unrelated jobs, both required to run in the single proxy Next.js allows:
//
// 1. Protects the staff-only routes — /admin, /api/admin and the door
//    check-in tablet at /checkin — with the HMAC-signed session cookie from
//    lib/admin/session.ts. (/checkin lists today's guests by name with their
//    payment status, so unlike the public scoring kiosk at /kiosk it can't be
//    left open; a tablet signs in once and the session lasts the shift.) Named `proxy.ts` per Next.js 16's renamed middleware
//    convention (middleware.ts is deprecated as of v16 — see
//    node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
//    Runs on the Node.js runtime by default in v16, which is what lets
//    lib/admin/session.ts's Web Crypto check run identically here and in the
//    login Server Action.
//
// 2. Captures partner referral links (?ref=) on every other route — the only
//    reason the matcher below now covers the whole site instead of just
//    /admin/*. An unknown/inactive ref code is silently ignored (never an
//    error); a valid one gets a 30-day cookie and a logged click, the latter
//    via event.waitUntil so it doesn't add latency to the page response.
//
// Per Next's Data Security guide, a proxy matcher that excludes a route also
// skips Server Function calls on that route — so the admin gate below is
// defence in depth, not the only check. Every admin-only server action still
// verifies its own caller state (or, for the mutations here, is only ever
// reachable through a page this proxy already gated).
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse, type NextFetchEvent } from "next/server";
import { isValidAdminSessionCookieValue, ADMIN_SESSION_COOKIE } from "@/lib/admin/session";
import { fetchActivePartnerByRefCode, logPartnerClick } from "@/lib/partners/partnersRepo";
import { UTOPIA_REF_COOKIE, REF_COOKIE_MAX_AGE_SECONDS } from "@/lib/partners/refCookie";

export const config = {
  matcher: [
    // Everything except static files, image optimization, and metadata files.
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

const STAFF_PREFIXES = ["/admin", "/api/admin", "/checkin"];

export async function proxy(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  if (STAFF_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return adminGate(req);
  }

  return captureReferral(req, event);
}

async function adminGate(req: NextRequest) {
  // The login page itself must stay reachable, or nobody could ever sign in.
  if (req.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (await isValidAdminSessionCookieValue(cookie)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", req.url);
  return NextResponse.redirect(loginUrl);
}

async function captureReferral(req: NextRequest, event: NextFetchEvent) {
  const ref = req.nextUrl.searchParams.get("ref");
  if (!ref) {
    return NextResponse.next();
  }

  const partner = await fetchActivePartnerByRefCode(ref);
  if (!partner) {
    return NextResponse.next(); // unknown/inactive ref — ignore silently, never an error
  }

  event.waitUntil(logPartnerClick(partner.refCode));

  const response = NextResponse.next();
  response.cookies.set(UTOPIA_REF_COOKIE, partner.refCode, {
    maxAge: REF_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
