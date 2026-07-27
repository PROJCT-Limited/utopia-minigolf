// FILE: proxy.ts
// -----------------------------------------------------------------------------
// Protects /admin and /api/admin with the HMAC-signed session cookie from
// lib/admin/session.ts. Named `proxy.ts` per Next.js 16's renamed middleware
// convention (middleware.ts is deprecated as of v16 — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
// Runs on the Node.js runtime by default in v16, which is what lets
// lib/admin/session.ts's Web Crypto check run identically here and in the
// login Server Action.
//
// Per Next's Data Security guide, a proxy matcher that excludes a route also
// skips Server Function calls on that route — so this is defence in depth,
// not the only check. Every admin-only server action still verifies its own
// caller state (or, for the mutations here, is only ever reachable through a
// page this proxy already gated).
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSessionCookieValue, ADMIN_SESSION_COOKIE } from "@/lib/admin/session";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export async function proxy(req: NextRequest) {
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
