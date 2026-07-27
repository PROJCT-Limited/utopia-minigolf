// FILE: lib/booking/rescheduleAction.ts
// -----------------------------------------------------------------------------
// Thin "use server" action wrapper around reschedule.ts's rescheduleBooking,
// so it can be called directly from the /manage/[token] client component.
// Kept separate from reschedule.ts because that file also exports a sync
// helper (isPastRescheduleCutoff) and is imported directly by Server
// Components — a "use server" file may only export async functions.
// -----------------------------------------------------------------------------
"use server";

import { rescheduleBooking, type RescheduleResult } from "./reschedule";

export async function rescheduleBookingAction(token: string, newWaveId: string): Promise<RescheduleResult> {
  return rescheduleBooking(token, newWaveId);
}
