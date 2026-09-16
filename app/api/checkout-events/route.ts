// FILE: app/api/checkout-events/route.ts
// -----------------------------------------------------------------------------
// POST /api/checkout-events — the browser reporting a checkout that failed in
// front of the guest.
//
// Public and unauthenticated by necessity: the whole point is to hear from a
// page whose payment never started, and there is no session to gate it with.
// So it accepts almost nothing — a type from a fixed list, an optional booking
// id, a short detail string — rate-limits per booking, and always answers 204
// whatever happens. A beacon that argues with the browser is worse than one
// that quietly drops a row: this must never become a reason a checkout breaks.
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rateLimit";
import { isCheckoutEventType, MAX_DETAIL_LENGTH, MAX_USER_AGENT_LENGTH } from "@/lib/booking/checkoutEvents";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Always the same answer, so nothing here can be used to probe which booking
// ids exist.
const ACCEPTED = new NextResponse(null, { status: 204 });

export async function POST(req: NextRequest) {
  let body: { type?: unknown; bookingId?: unknown; detail?: unknown };
  try {
    body = await req.json();
  } catch {
    return ACCEPTED;
  }

  if (!isCheckoutEventType(body.type)) return ACCEPTED;

  const bookingId = typeof body.bookingId === "string" && UUID_RE.test(body.bookingId) ? body.bookingId : null;
  const detail = typeof body.detail === "string" ? body.detail.slice(0, MAX_DETAIL_LENGTH) : null;
  const userAgent = req.headers.get("user-agent")?.slice(0, MAX_USER_AGENT_LENGTH) ?? null;

  // A stuck guest retrying is exactly the signal worth keeping, so the ceiling
  // is generous; it's here to stop a loop writing thousands of rows, not to
  // ration honest reports. Keyed by booking where there is one, so one bad
  // session can't drown out everyone else's.
  const { allowed } = await checkRateLimit("checkout-events", bookingId ?? "anonymous", {
    max: 40,
    windowMinutes: 60,
  });
  if (!allowed) return ACCEPTED;

  const { error } = await supabaseAdmin.from("checkout_events").insert({
    booking_id: bookingId,
    type: body.type,
    detail,
    user_agent: userAgent,
  });

  if (error) {
    console.error("checkout-events: insert failed:", error.message);
  }

  return ACCEPTED;
}
