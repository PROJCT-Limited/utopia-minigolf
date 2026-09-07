// FILE: lib/booking/copy.ts
// -----------------------------------------------------------------------------
// The one place the reschedule guardrail is worded. Reused at booking Step 4,
// the confirmation page, the manage page, and the confirmation email, so the
// wording never drifts between them.
//
// The "opening dates are still provisional" notice that used to live here is
// gone: every bookable wave is confirmed, so it never rendered.
// -----------------------------------------------------------------------------

export const RESCHEDULE_CUTOFF_DAYS = Number(process.env.RESCHEDULE_CUTOFF_DAYS ?? 10);

export const RESCHEDULE_NOTICE = `Your date is confirmed — you can reschedule to any available start time once, self-serve, up until ${RESCHEDULE_CUTOFF_DAYS} days before it.`;
