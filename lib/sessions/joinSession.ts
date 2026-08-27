// FILE: lib/sessions/joinSession.ts
// -----------------------------------------------------------------------------
// Server action behind the /session/[token] "Join & pay" form: re-validates
// the session is still joinable against the server's own view (never trusts
// the client), creates the joiner's participant row, and opens a Stripe
// PaymentIntent for their own single place, priced at the session's own
// ticket type (set once by the host — see createSession.ts). Same accepted-
// race tolerance as the rest of this codebase's capacity bookkeeping (see
// wavesRepo/reschedule) — two people racing to fill the last spot could both
// slip through, worth it to avoid a DB function for a single-operator,
// low-volume flow.
//
// Wave-slot capacity for the session was already reserved once, when the
// host's payment confirmed (see confirmSession.ts) — a joiner only competes
// for the session's own max_players headcount, not wave-slot capacity.
// -----------------------------------------------------------------------------
"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";
import { TICKET_PRICE_PER_PERSON_CENTS, CURRENCY } from "@/lib/booking/pricing";
import { generateManageToken } from "@/lib/booking/token";
import { fetchWaveById } from "@/lib/booking/wavesRepo";
import { fetchSessionByShareToken, countPaidParticipants } from "./sessionsRepo";
import { isSessionJoinable } from "./sessionCapacity";

export interface JoinSessionInput {
  shareToken: string;
  name: string;
  email: string;
}

export type JoinSessionResult =
  | { ok: true; participantId: string; clientSecret: string }
  | { ok: false; error: string };

export async function joinSessionWithPaymentIntent(input: JoinSessionInput): Promise<JoinSessionResult> {
  const { shareToken, name, email } = input;

  if (!name.trim() || !email.trim()) {
    return { ok: false, error: "Name and email are required." };
  }

  const session = await fetchSessionByShareToken(shareToken);
  if (!session) return { ok: false, error: "That session doesn't exist." };

  const wave = await fetchWaveById(session.waveId);
  if (!wave) return { ok: false, error: "That slot no longer exists." };

  const paidCount = await countPaidParticipants(session.id);
  if (!isSessionJoinable({ status: session.status, paidCount, maxPlayers: session.maxPlayers, waveIsFull: wave.isFull })) {
    return { ok: false, error: "This session is full." };
  }

  const amountCents = TICKET_PRICE_PER_PERSON_CENTS[session.ticketType];
  const manageToken = generateManageToken();
  const { data: participant, error: insertError } = await supabaseAdmin
    .from("session_participants")
    .insert({
      session_id: session.id,
      name: name.trim(),
      email: email.trim(),
      amount_paid_cents: amountCents,
      currency: CURRENCY,
      status: "pending",
      manage_token: manageToken,
      is_host: false,
    })
    .select("id")
    .single();

  if (insertError || !participant) {
    console.error("joinSessionWithPaymentIntent: participant insert failed:", insertError?.message);
    return { ok: false, error: "Couldn't join the session. Please try again." };
  }

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: CURRENCY,
      metadata: { session_participant_id: participant.id, session_id: session.id },
      automatic_payment_methods: { enabled: true },
    });
  } catch (err) {
    console.error("joinSessionWithPaymentIntent: Stripe PaymentIntent failed:", (err as Error).message);
    await supabaseAdmin.from("session_participants").update({ status: "cancelled" }).eq("id", participant.id);
    return { ok: false, error: "Couldn't start payment. Please try again." };
  }

  const { error: updateError } = await supabaseAdmin
    .from("session_participants")
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq("id", participant.id);
  if (updateError) {
    console.error("joinSessionWithPaymentIntent: participant update failed:", updateError.message);
  }

  if (!paymentIntent.client_secret) {
    return { ok: false, error: "Couldn't start payment. Please try again." };
  }

  return { ok: true, participantId: participant.id, clientSecret: paymentIntent.client_secret };
}
