// FILE: lib/booking/checkoutEvents.ts
// -----------------------------------------------------------------------------
// The shape of a checkout failure, shared by the browser that reports one and
// the route that stores it. Pure — no Supabase import — so the client bundle
// can use the type list without pulling a server client in behind it.
// -----------------------------------------------------------------------------

export const CHECKOUT_EVENT_TYPES = [
  /** Stripe.js never loaded: blocker, captive portal, dropped connection. */
  "stripe_js_failed",
  /** It did load, but slowly enough that the guest was told it was coming. */
  "stripe_js_slow",
  /** confirmPayment came back with an error — the card, or the bank. */
  "confirm_error",
  /** It came back without an error and without a finished payment either. */
  "intent_unfinished",
  /** Someone opened a resume link for a booking they'd left behind. */
  "resume_opened",
] as const;

export type CheckoutEventType = (typeof CHECKOUT_EVENT_TYPES)[number];

export const CHECKOUT_EVENT_LABELS: Record<CheckoutEventType, string> = {
  stripe_js_failed: "card form didn't load",
  stripe_js_slow: "card form was slow",
  confirm_error: "payment refused",
  intent_unfinished: "payment unfinished",
  resume_opened: "opened a resume link",
};

/** The types worth calling a problem — the rest are breadcrumbs. */
export const CHECKOUT_FAILURE_TYPES: CheckoutEventType[] = [
  "stripe_js_failed",
  "confirm_error",
  "intent_unfinished",
];

export function isCheckoutEventType(value: unknown): value is CheckoutEventType {
  return typeof value === "string" && (CHECKOUT_EVENT_TYPES as readonly string[]).includes(value);
}

export const MAX_DETAIL_LENGTH = 300;
export const MAX_USER_AGENT_LENGTH = 400;
