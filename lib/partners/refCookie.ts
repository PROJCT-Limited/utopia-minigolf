// FILE: lib/partners/refCookie.ts
// -----------------------------------------------------------------------------
// The one place the ref-tracking cookie's name/TTL are defined — imported by
// both proxy.ts (which sets it, via NextResponse's cookie API) and the
// checkout actions (which read it, via next/headers' cookies()). Those are
// two different cookie APIs, so only the shared constants live here, not any
// read/write logic itself.
// -----------------------------------------------------------------------------

export const UTOPIA_REF_COOKIE = "utopia_ref";

/** How long a referral survives browsing/returning before it stops counting. */
export const REF_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
