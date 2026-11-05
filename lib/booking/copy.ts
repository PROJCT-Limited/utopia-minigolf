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

import {
  FAMILY_EXTRA_CHILD_CENTS,
  FAMILY_MAX_CHILDREN,
  FAMILY_STARTS_BEFORE,
  PREBOOKING_DEADLINE_LABEL,
} from "./pricing";

export const RESCHEDULE_CUTOFF_DAYS = Number(process.env.RESCHEDULE_CUTOFF_DAYS ?? 10);

export const RESCHEDULE_NOTICE = `Your date is confirmed — you can reschedule to any available start time once, self-serve, up until ${RESCHEDULE_CUTOFF_DAYS} days before it.`;

// No longer states the discount by crossing out the list price next to it —
// the countdown strip carries the deadline, so this says plainly that the
// prices shown are the reduced ones and won't last.
export const PREBOOKING_NOTICE = `These are pre-booking prices — they go up after ${PREBOOKING_DEADLINE_LABEL}, Hong Kong time.`;

// Why the soft-opening evenings are short and cheap, said once for the home
// page's price list.
export const SOFT_OPENING_NOTICE =
  "During the soft opening we're still tuning the automated scoring, so tickets are limited to one round, evenings run 6–9pm, and prices are lower. Every station is open to play.";

// The family ticket's rules, worded once for the ticket card, the homepage
// price list, the booking steps and the confirmation email. Prices and the
// cut-off are read from pricing.ts so the copy can't drift from the charge.
const hkd = (cents: number) => `HK$${(cents / 100).toFixed(0)}`;

export const FAMILY_TICKET_NOTE = `Starts before ${FAMILY_STARTS_BEFORE}. Children aged 3 to 11, extra children ${hkd(FAMILY_EXTRA_CHILD_CENTS)} each (up to ${FAMILY_MAX_CHILDREN} children). Anyone 12 or over books a Standard ticket.`;

export const FAMILY_SUPERVISION_NOTICE =
  "Children must stay with an adult at all times. Adults are responsible for their children throughout the visit.";

export const FAMILY_DRINKS_NOTICE =
  "Adults get their included drink, children get a soft drink. Under 18s can’t be served alcohol.";

/** Shown against start times a family ticket can't book. */
export const FAMILY_SLOT_NOTE = `Family tickets are available before ${FAMILY_STARTS_BEFORE}`;
