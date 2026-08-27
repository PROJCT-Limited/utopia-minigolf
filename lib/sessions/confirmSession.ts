// FILE: lib/sessions/confirmSession.ts
// -----------------------------------------------------------------------------
// Called ONLY from app/api/webhooks/stripe/route.ts, after Stripe confirms a
// payment_intent.succeeded event for a session participant — this is the
// single place session_participants.status flips to 'paid'. Idempotent via
// stripe_payment_intent_id being unique and the status guard below, mirroring
// confirmBooking.ts's markBookingPaidByPaymentIntent.
//
// Wave-slot capacity is reserved exactly ONCE per session, on the HOST's own
// payment confirmation (a session is one physical group departing together,
// so its wave-slot claim happens when the group itself becomes real, not per
// joiner). Non-host joiners only compete for the session's own max_players
// headcount, never for wave-slot capacity.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendHostSessionCreated, sendSessionParticipantJoined } from "@/lib/email/send";
import { fetchSessionById, countPaidParticipants } from "./sessionsRepo";
import { shouldSessionBecomeFull } from "./sessionCapacity";
import { addWaveSlots } from "@/lib/booking/waveCapacity";
import { fetchWaveById } from "@/lib/booking/wavesRepo";

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
    if (participant.is_host) {
      // One session = one group = one slot, regardless of ticket type.
      await addWaveSlots(session.wave_id, 1);
    }

    const wave = await fetchWaveById(session.wave_id);
    const paidCount = await countPaidParticipants(session.id);
    if (session.status === "open" && shouldSessionBecomeFull({ paidCount, maxPlayers: session.max_players, waveIsFull: wave?.isFull ?? false })) {
      await supabaseAdmin.from("sessions").update({ status: "full", updated_at: new Date().toISOString() }).eq("id", session.id);
    }
  }

  const emailResult = participant.is_host
    ? await sendHostSessionCreated(participant.id)
    : await sendSessionParticipantJoined(participant.id);
  console.log("markParticipantPaidByPaymentIntent: marked paid", participant.id, "email sent:", emailResult.sent);
}
