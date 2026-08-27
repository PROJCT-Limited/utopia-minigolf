// FILE: lib/booking/confirmBooking.ts
// -----------------------------------------------------------------------------
// Called ONLY from app/api/webhooks/stripe/route.ts, after Stripe confirms a
// payment_intent.succeeded event — this is the single place bookings.status
// flips to 'paid'. Idempotent via bookings.stripe_payment_intent_id being
// unique and the status guard below, so a replayed webhook delivery is safe.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendBookingConfirmation } from "@/lib/email/send";
import { addWaveSlots } from "./waveCapacity";

export async function markBookingPaidByPaymentIntent(paymentIntentId: string): Promise<void> {
  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("id, wave_id, status")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (error || !booking) {
    console.error("markBookingPaidByPaymentIntent: booking not found for", paymentIntentId, error?.message);
    return;
  }

  if (booking.status === "paid") {
    return; // already processed by an earlier delivery of this event
  }

  const { error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("id", booking.id);
  if (updateError) {
    console.error("markBookingPaidByPaymentIntent: booking update failed:", updateError.message);
    return;
  }

  // One booking = one group = one slot, regardless of ticket type.
  await addWaveSlots(booking.wave_id, 1);
  await sendBookingConfirmation(booking.id);
}
