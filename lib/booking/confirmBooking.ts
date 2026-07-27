// FILE: lib/booking/confirmBooking.ts
// -----------------------------------------------------------------------------
// Called ONLY from app/api/webhooks/stripe/route.ts, after Stripe confirms a
// payment_intent.succeeded event — this is the single place bookings.status
// flips to 'paid'. Idempotent via bookings.stripe_payment_intent_id being
// unique and the status guard below, so a replayed webhook delivery is safe.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendBookingConfirmation } from "@/lib/email/send";

export async function markBookingPaidByPaymentIntent(paymentIntentId: string): Promise<void> {
  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("id, wave_id, headcount, status")
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

  const { data: wave } = await supabaseAdmin
    .from("waves")
    .select("id, capacity, booked")
    .eq("id", booking.wave_id)
    .maybeSingle();

  if (wave) {
    const newBooked = Math.min(wave.capacity, wave.booked + booking.headcount);
    await supabaseAdmin
      .from("waves")
      .update({ booked: newBooked, status: newBooked >= wave.capacity ? "full" : undefined })
      .eq("id", wave.id);
  }

  await sendBookingConfirmation(booking.id);
}
