// FILE: lib/booking/createBooking.ts
// -----------------------------------------------------------------------------
// Server action behind booking Step 4 ("Pay"): validates the wizard's choices
// against the server's own view of the wave/pricing/18+ rules (never trusts
// anything the client computed), creates the pending booking row, and opens a
// Stripe PaymentIntent for it. Nothing here marks the booking paid — only the
// webhook (app/api/webhooks/stripe/route.ts) does that, after Stripe confirms.
// -----------------------------------------------------------------------------
"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";
import { computeBookingTotalCents, isValidHeadcountForPartyType, CURRENCY } from "./pricing";
import { generateManageToken } from "./token";
import { fetchWaveById } from "./wavesRepo";

export interface PairingInput {
  ageBand: string | null;
  interests: string[];
  bio: string | null;
  overEighteen: boolean;
  pairOptIn: boolean;
}

export interface CreateBookingInput {
  waveId: string;
  partyType: "solo" | "pair" | "group";
  headcount: number;
  leadName: string;
  leadEmail: string;
  pairing: PairingInput | null;
}

export type CreateBookingResult =
  | { ok: true; bookingId: string; clientSecret: string }
  | { ok: false; error: string };

export async function createBookingWithPaymentIntent(
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  const { waveId, partyType, headcount, leadName, leadEmail, pairing } = input;

  if (!leadName.trim() || !leadEmail.trim()) {
    return { ok: false, error: "Name and email are required." };
  }
  if (!isValidHeadcountForPartyType(partyType, headcount)) {
    return { ok: false, error: "Party size doesn't match the selected party type." };
  }
  // "Pair me up" requires the 18+ checkbox — enforced here too, not just in the UI.
  if (pairing?.pairOptIn && !pairing.overEighteen) {
    return { ok: false, error: "Pairing requires confirming you're 18 or over." };
  }

  const wave = await fetchWaveById(waveId);
  if (!wave) return { ok: false, error: "That wave no longer exists." };
  if (wave.isFull || wave.spotsLeft < headcount) {
    return { ok: false, error: "Not enough spots left in that wave." };
  }

  const amountCents = computeBookingTotalCents(headcount);
  const manageToken = generateManageToken();

  const { data: booking, error: insertError } = await supabaseAdmin
    .from("bookings")
    .insert({
      wave_id: waveId,
      lead_name: leadName.trim(),
      lead_email: leadEmail.trim(),
      party_type: partyType,
      headcount,
      amount_paid_cents: amountCents,
      currency: CURRENCY,
      status: "pending",
      manage_token: manageToken,
      pair_opt_in: pairing?.pairOptIn ?? false,
    })
    .select("id")
    .single();

  if (insertError || !booking) {
    console.error("createBookingWithPaymentIntent: booking insert failed:", insertError?.message);
    return { ok: false, error: "Couldn't create the booking. Please try again." };
  }

  // Pairing data is only worth storing if the guest actually opted in — it
  // exists purely to help staff pair people on the day (never shown publicly
  // or to other guests), so an unopted-in "about you" section isn't persisted.
  if (pairing?.pairOptIn) {
    const { error: pairingError } = await supabaseAdmin.from("pairing_profiles").insert({
      booking_id: booking.id,
      age_band: pairing.ageBand,
      interests: pairing.interests,
      bio: pairing.bio,
      over_18: pairing.overEighteen,
    });
    if (pairingError) {
      console.error("createBookingWithPaymentIntent: pairing_profiles insert failed:", pairingError.message);
      // Not fatal to the booking itself — pairing is a nice-to-have, payment isn't.
    }
  }

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: CURRENCY,
      metadata: { booking_id: booking.id },
      automatic_payment_methods: { enabled: true },
    });
  } catch (err) {
    console.error("createBookingWithPaymentIntent: Stripe PaymentIntent failed:", (err as Error).message);
    await supabaseAdmin.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    return { ok: false, error: "Couldn't start payment. Please try again." };
  }

  const { error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq("id", booking.id);
  if (updateError) {
    console.error("createBookingWithPaymentIntent: booking update failed:", updateError.message);
  }

  if (!paymentIntent.client_secret) {
    return { ok: false, error: "Couldn't start payment. Please try again." };
  }

  return { ok: true, bookingId: booking.id, clientSecret: paymentIntent.client_secret };
}
