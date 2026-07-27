// FILE: lib/booking/token.ts
// -----------------------------------------------------------------------------
// The manage-booking token: generated once at booking creation, mailed once
// in the confirmation email, and valid as a permanent (not short-TTL) lookup
// key for /manage/[token] until reschedule_used is set or the reschedule
// cutoff passes. Unlike a TTL "email me a new link" flow, there's no reissue
// path — the one link mailed at booking time is the only one that ever exists.
// -----------------------------------------------------------------------------

import { randomBytes } from "node:crypto";

export function generateManageToken(): string {
  return randomBytes(32).toString("hex");
}
