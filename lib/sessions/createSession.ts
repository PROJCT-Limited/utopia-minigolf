// FILE: lib/sessions/createSession.ts
// -----------------------------------------------------------------------------
// Server action behind the public-session wizard's pay step: creates the
// session and its host participant (the host is just participant #1),
// validates against the server's own view of the wave (never trusts the
// client), and opens a Stripe PaymentIntent for the host's own single place.
// Nothing here marks the participant paid — only the webhook does that (see
// confirmSession.ts), same rule as private bookings.
// -----------------------------------------------------------------------------
"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";
import { PRICE_PER_PERSON_CENTS, CURRENCY } from "@/lib/booking/pricing";
import { generateManageToken } from "@/lib/booking/token";
import { fetchWaveById } from "@/lib/booking/wavesRepo";

export interface CreateSessionInput {
  waveId: string;
  hostName: string;
  hostEmail: string;
}

export type CreateSessionResult =
  | { ok: true; shareToken: string; participantId: string; clientSecret: string }
  | { ok: false; error: string };

export async function createSessionWithPaymentIntent(
  input: CreateSessionInput
): Promise<CreateSessionResult> {
  const { waveId, hostName, hostEmail } = input;

  if (!hostName.trim() || !hostEmail.trim()) {
    return { ok: false, error: "Name and email are required." };
  }

  const wave = await fetchWaveById(waveId);
  if (!wave) return { ok: false, error: "That wave no longer exists." };
  if (wave.isFull || wave.spotsLeft < 1) {
    return { ok: false, error: "Not enough spots left in that wave." };
  }

  const { data: existingSessions, error: existingSessionError } = await supabaseAdmin
    .from("sessions")
    .select("id")
    .eq("wave_id", waveId)
    .limit(1);
  if (existingSessionError) {
    console.error("createSessionWithPaymentIntent: existing-session check failed:", existingSessionError.message);
  }
  if (existingSessions && existingSessions.length > 0) {
    return { ok: false, error: "This wave already has a public session — join it via its link, or pick another wave." };
  }

  const shareToken = generateManageToken();

  const { data: session, error: sessionInsertError } = await supabaseAdmin
    .from("sessions")
    .insert({ wave_id: waveId, share_token: shareToken, status: "open" })
    .select("id")
    .single();

  if (sessionInsertError) {
    // Unique violation on wave_id => a concurrent request just created this
    // wave's session first (see migrations/006_one_session_per_wave.sql).
    if (sessionInsertError.code === "23505") {
      return { ok: false, error: "This wave already has a public session — join it via its link, or pick another wave." };
    }
    console.error("createSessionWithPaymentIntent: session insert failed:", sessionInsertError.message);
    return { ok: false, error: "Couldn't create the session. Please try again." };
  }
  if (!session) {
    return { ok: false, error: "Couldn't create the session. Please try again." };
  }

  const manageToken = generateManageToken();
  const { data: participant, error: participantInsertError } = await supabaseAdmin
    .from("session_participants")
    .insert({
      session_id: session.id,
      name: hostName.trim(),
      email: hostEmail.trim(),
      amount_paid_cents: PRICE_PER_PERSON_CENTS,
      currency: CURRENCY,
      status: "pending",
      manage_token: manageToken,
      is_host: true,
    })
    .select("id")
    .single();

  if (participantInsertError || !participant) {
    console.error(
      "createSessionWithPaymentIntent: participant insert failed:",
      participantInsertError?.message
    );
    return { ok: false, error: "Couldn't create the session. Please try again." };
  }

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: PRICE_PER_PERSON_CENTS,
      currency: CURRENCY,
      metadata: { session_participant_id: participant.id, session_id: session.id },
      automatic_payment_methods: { enabled: true },
    });
  } catch (err) {
    console.error("createSessionWithPaymentIntent: Stripe PaymentIntent failed:", (err as Error).message);
    await supabaseAdmin.from("session_participants").update({ status: "cancelled" }).eq("id", participant.id);
    return { ok: false, error: "Couldn't start payment. Please try again." };
  }

  const { error: updateError } = await supabaseAdmin
    .from("session_participants")
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq("id", participant.id);
  if (updateError) {
    console.error("createSessionWithPaymentIntent: participant update failed:", updateError.message);
  }

  if (!paymentIntent.client_secret) {
    return { ok: false, error: "Couldn't start payment. Please try again." };
  }

  return {
    ok: true,
    shareToken,
    participantId: participant.id,
    clientSecret: paymentIntent.client_secret,
  };
}
