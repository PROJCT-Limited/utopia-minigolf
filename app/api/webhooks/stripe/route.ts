// FILE: app/api/webhooks/stripe/route.ts
// -----------------------------------------------------------------------------
// POST /api/webhooks/stripe
// The SOURCE OF TRUTH for payment. Neither the browser redirect after
// confirmPayment() nor anything else ever marks a booking 'paid' — only this
// handler does, after Stripe confirms it.
//
// Must run on Node (raw body + signature verification, not Edge). Idempotent
// via the status guard in markBookingPaidByPaymentIntent (a booking already
// 'paid' is a no-op), same tolerance the rest of this codebase's webhook
// handling documents.
// -----------------------------------------------------------------------------

import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/server";
import { markBookingPaidByPaymentIntent } from "@/lib/booking/confirmBooking";
import { markParticipantPaidByPaymentIntent } from "@/lib/sessions/confirmSession";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("stripe webhook signature verification failed:", (err as Error).message);
    return new Response("bad signature", { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    if (pi.metadata?.booking_id) {
      await markBookingPaidByPaymentIntent(pi.id);
    } else if (pi.metadata?.session_participant_id) {
      await markParticipantPaidByPaymentIntent(pi.id);
    }
  } else if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    console.error("payment_intent.payment_failed:", pi.id, pi.last_payment_error?.message);
  }

  return new Response("ok", { status: 200 });
}
