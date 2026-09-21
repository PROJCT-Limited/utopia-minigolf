// FILE: lib/booking/supersededPendingsRepo.ts
// -----------------------------------------------------------------------------
// Acts on findSupersededPendings(): cancels the abandoned checkouts a later
// payment has answered. Runs nightly from the digest cron.
//
// Cancelling one of these frees nothing and refunds nothing, because a pending
// booking never held anything: seats are reserved by the Stripe webhook when
// the payment lands, not when the row is written. This only changes what staff
// see.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import { findSupersededPendings, type SweepableBooking } from "./supersededPendings";

export interface SweepResult {
  cancelled: number;
  ids: string[];
}

export async function sweepSupersededPendings({ dryRun = false } = {}): Promise<SweepResult> {
  const bookings: SweepableBooking[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("id, status, lead_email, lead_name, created_at")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("sweepSupersededPendings: query failed:", error.message);
      return { cancelled: 0, ids: [] };
    }
    bookings.push(...((data ?? []) as SweepableBooking[]));
    if (!data || data.length < pageSize) break;
  }

  const ids = findSupersededPendings(bookings);
  if (ids.length === 0 || dryRun) return { cancelled: 0, ids };

  // Still filtered on `pending`, so a row that was paid between the read above
  // and this write is never overwritten.
  const { data: updated, error } = await supabaseAdmin
    .from("bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .in("id", ids)
    .eq("status", "pending")
    .select("id");

  if (error) {
    console.error("sweepSupersededPendings: update failed:", error.message);
    return { cancelled: 0, ids };
  }

  return { cancelled: updated?.length ?? 0, ids };
}
