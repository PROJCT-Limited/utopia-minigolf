// FILE: lib/booking/copy.ts
// -----------------------------------------------------------------------------
// The one place the "date to be confirmed" guardrail is worded. Reused at
// booking Step 2, Step 4, the confirmation page, and the confirmation email —
// so no guest can plausibly think they've bought a fixed slot, and the
// wording never drifts between those four places.
// -----------------------------------------------------------------------------

export const RESCHEDULE_CUTOFF_DAYS = Number(process.env.RESCHEDULE_CUTOFF_DAYS ?? 10);

export const DATE_TBC_NOTICE =
  "Opening dates are still provisional. We'll email you the exact date and time slot as soon as it's confirmed.";

export const RESCHEDULE_NOTICE = `Once your date is confirmed, you can reschedule to any available wave once, self-serve, up until ${RESCHEDULE_CUTOFF_DAYS} days before it.`;

// -----------------------------------------------------------------------------
// Public sessions — the one place this copy is worded, reused by the booking
// entry step, the session page, and the session emails.
// -----------------------------------------------------------------------------

export const PUBLIC_SESSION_EXPLAINER =
  "Start a session and share the link — anyone who joins pays for their own place. Runs with 2 to 5 players.";

export const SESSION_FULL_NOTICE = "This session is full.";
