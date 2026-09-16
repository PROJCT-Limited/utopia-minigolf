// FILE: lib/stripe/client.ts
// -----------------------------------------------------------------------------
// Browser-side Stripe.js singleton. Uses ONLY the publishable key — never
// import lib/stripe/server.ts (the secret-key client) from here or from any
// client component.
// -----------------------------------------------------------------------------
"use client";

import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";

let stripePromise: Promise<StripeJs | null> | null = null;

export function getStripe(): Promise<StripeJs | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
}

/**
 * Forget a failed load so the next getStripe() fetches js.stripe.com again.
 *
 * loadStripe() caches its promise, rejection included: once the script fails
 * — a blocker, a captive portal, a dropped connection on venue wifi — every
 * later call returns the same rejected promise, and the payment form stays
 * dead for as long as the tab is open. The retry in PaymentStep calls this
 * first so a second attempt is a real one.
 */
export function resetStripe(): void {
  stripePromise = null;
}
