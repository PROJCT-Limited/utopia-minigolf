// FILE: lib/admin/privateLink.ts
// -----------------------------------------------------------------------------
// The link that gets an unlisted start time booked. A hidden wave is left out
// of every public query (see wavesRepo.fetchUpcomingWaves), so this token is
// the only way in — 32 random bytes, the same shape and strength as the
// manage-booking token, and re-rollable from the admin panel if a link ends
// up somewhere it shouldn't have.
//
// SERVER ONLY: node:crypto, and NEXT_PUBLIC_SITE_URL is read at call time so
// the printed link matches whichever deployment is serving the admin panel.
// -----------------------------------------------------------------------------

import { randomBytes } from "node:crypto";

export function generatePrivateWaveToken(): string {
  return randomBytes(32).toString("hex");
}

export function privateBookingUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return `${base}/book/private/${token}`;
}
