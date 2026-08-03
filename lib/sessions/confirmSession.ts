// FILE: lib/sessions/confirmSession.ts
// -----------------------------------------------------------------------------
// Called ONLY from app/api/webhooks/stripe/route.ts, after Stripe confirms a
// payment_intent.succeeded event for a session participant — this is the
// single place session_participants.status flips to 'paid'. Idempotent via
// stripe_payment_intent_id being unique and the status guard below, mirroring
// confirmBooking.ts's markBookingPaidByPaymentIntent.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendHostSessionCreated, sendSessionParticipantJoined } from "@/lib/email/send";
import { fetchSessionById, countPaidParticipants } from "./sessionsRepo";
import { shouldSessionBecomeFull } from "./sessionCapacity";

export async function markParticipantPaidByPaymentIntent(paymentIntentId: string): Promise<void> {
  const { data: participant, error } = await supabaseAdmin
    .from("session_participants")
    .select("id, session_id, status, is_host")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (error || !participant) {
    console.error("markParticipantPaidByPaymentIntent: participant not found for", paymentIntentId, error?.message);
    return;
  }

  if (participant.status === "paid") {
    return; // already processed by an earlier delivery of this event
  }

  const { error: updateError } = await supabaseAdmin
    .from("session_participants")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("id", participant.id);
  if (updateError) {
    console.error("markParticipantPaidByPaymentIntent: participant update failed:", updateError.message);
    return;
  }

  const session = await fetchSessionById(participant.session_id);
  if (session) {
    const { data: wave } = await supabaseAdmin
      .from("waves")
      .select("id, capacity, booked")
      .eq("id", session.wave_id)
      .maybeSingle();

    let waveIsFull = false;
    if (wave) {
      const newBooked = Math.min(wave.capacity, wave.booked + 1);
      waveIsFull = newBooked >= wave.capacity;
      await supabaseAdmin
        .from("waves")
        .update({ booked: newBooked, status: waveIsFull ? "full" : undefined })
        .eq("id", wave.id);
    }

    const paidCount = await countPaidParticipants(session.id);
    if (session.status === "open" && shouldSessionBecomeFull({ paidCount, maxPlayers: session.max_players, waveIsFull })) {
      await supabaseAdmin.from("sessions").update({ status: "full", updated_at: new Date().toISOString() }).eq("id", session.id);
    }
  }

  if (participant.is_host) {
    await sendHostSessionCreated(participant.id);
  } else {
    await sendSessionParticipantJoined(participant.id);
  }
}
