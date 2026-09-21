// FILE: lib/booking/copy.ts
// -----------------------------------------------------------------------------
// The one place the reschedule guardrail is worded. Reused at booking Step 4,
// the confirmation page, the manage page, and the confirmation email, so the
// wording never drifts between them.
//
// The "opening dates are still provisional" notice that used to live here is
// gone: every bookable wave is confirmed, so it never rendered.
//
// The pre-booking notice earns its place here for the same reason: it has to
// read identically on the home page and at step 1 of the wizard.
// -----------------------------------------------------------------------------

import { PREBOOKING_DEADLINE_LABEL } from "./pricing";

export const RESCHEDULE_CUTOFF_DAYS = Number(process.env.RESCHEDULE_CUTOFF_DAYS ?? 10);

export const RESCHEDULE_NOTICE = `Your date is confirmed — you can reschedule to any available start time once, self-serve, up until ${RESCHEDULE_CUTOFF_DAYS} days before it.`;

// No longer states the discount by crossing out the list price next to it —
// the countdown strip carries the deadline, so this says plainly that the
// prices shown are the reduced ones and won't last.
export const PREBOOKING_NOTICE = `These are pre-booking prices — they go up after ${PREBOOKING_DEADLINE_LABEL}, Hong Kong time.`;
