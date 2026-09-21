// FILE: lib/booking/resumeBooking.ts
// -----------------------------------------------------------------------------
// Picking a checkout back up where it stopped.
//
// A booking row is written before payment and only marked paid by the Stripe
// webhook, so an interrupted checkout leaves a real reservation with nobody
// able to finish it: the manage link is only mailed after payment, and the
// wizard's own state is gone once the tab is. That was a HK$720 booking left
// stranded for six hours on 15 September.
//
// This re-opens exactly that booking — same row, same price — rather than
// starting a new one, so a guest who comes back doesn't end up with two.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";
import { fetchWaveById } from "./wavesRepo";
import { hasRoomForGroup } from "./waveCapacity";
import type { BookingSummary } from "./bookingRepo";
import { fetchBookingSummary } from "./bookingRepo";

export type ResumableBooking =
  | { state: "resumable"; booking: BookingSummary; clientSecret: string; waveTimeLabel: string }
  | { state: "paid"; booking: BookingSummary }
  | { state: "gone"; reason: "not-found" | "cancelled" | "full" };

export async function fetchResumableBooking(bookingId: string): Promise<ResumableBooking> {
  const booking = await fetchBookingSummary(bookingId);
  if (!booking) return { state: "gone", reason: "not-found" };

  // Already done — the caller sends these to the confirmation page instead of
  // charging twice.
  if (booking.status === "paid") return { state: "paid", booking };
  if (booking.status === "cancelled") return { state: "gone", reason: "cancelled" };

  const { data: row } = await supabaseAdmin
    .from("bookings")
    .select("wave_id, stripe_payment_intent_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!row) return { state: "gone", reason: "not-found" };

  const wave = await fetchWaveById(row.wave_id);
  if (!wave) return { state: "gone", reason: "not-found" };

  // The start time may have sold out while the guest was away. Their seats
  // were never held — only paid bookings hold capacity — so this has to be
  // re-checked before offering the payment form again.
  if (!hasRoomForGroup(wave, booking.headcount)) return { state: "gone", reason: "full" };

  const clientSecret = await usablePaymentIntent(bookingId, row.stripe_payment_intent_id, booking);
  if (!clientSecret) return { state: "gone", reason: "not-found" };

  // Worth knowing how often a checkout has to be picked up again, and by
  // whom — recorded here rather than from the browser, since the page is
  // server-rendered and the fact doesn't depend on any script loading.
  const { error: eventError } = await supabaseAdmin
    .from("checkout_events")
    .insert({ booking_id: bookingId, type: "resume_opened" });
  if (eventError) console.error("fetchResumableBooking: couldn't record the resume:", eventError.message);

  return { state: "resumable", booking, clientSecret, waveTimeLabel: wave.timeLabel };
}

/**
 * The original PaymentIntent if it can still be paid, otherwise a fresh one
 * for the same amount.
 *
 * Reusing it matters: the amount was fixed when the booking was made, so a
 * guest who started before a price change still pays what they were quoted —
 * the same rule the pre-booking deadline follows in pricing.ts.
 */
async function usablePaymentIntent(
  bookingId: string,
  existingId: string | null,
  booking: BookingSummary
): Promise<string | null> {
  if (existingId) {
    try {
      const intent = await stripe.paymentIntents.retrieve(existingId);
      if (
        intent.client_secret &&
        (intent.status === "requires_payment_method" || intent.status === "requires_confirmation")
      ) {
        return intent.client_secret;
      }
      // succeeded/processing are handled by the status check above; anything
      // else (cancelled, or an intent that's moved on) needs a new one.
    } catch (err) {
      console.error("fetchResumableBooking: couldn't read the payment intent:", (err as Error).message);
    }
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount: booking.amountPaidCents,
      currency: booking.currency,
      metadata: { booking_id: bookingId, resumed: "true" },
      payment_method_types: ["card"],
      description: `FOUND · resumed · ${booking.headcount} × ${booking.ticketType}`,
    });

    await supabaseAdmin
      .from("bookings")
      .update({ stripe_payment_intent_id: intent.id })
      .eq("id", bookingId);

    return intent.client_secret;
  } catch (err) {
    console.error("fetchResumableBooking: couldn't open a payment intent:", (err as Error).message);
    return null;
  }
}
