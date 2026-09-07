// FILE: lib/booking/createBooking.ts
// -----------------------------------------------------------------------------
// Server action behind booking Step 4 ("Pay"): validates the wizard's choices
// against the server's own view of the wave/pricing rules (never trusts
// anything the client computed), creates the pending booking row, and opens a
// Stripe PaymentIntent for it. Nothing here marks the booking paid — only the
// webhook (app/api/webhooks/stripe/route.ts) does that, after Stripe confirms.
// -----------------------------------------------------------------------------
"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";
import {
  computeBookingTotalCents,
  derivePartyTypeFromHeadcount,
  isValidHeadcount,
  isValidTicketType,
  CURRENCY,
  type TicketType,
} from "./pricing";
import { hasRoomForGroup } from "./waveCapacity";
import { generateManageToken } from "./token";
import { fetchWaveById } from "./wavesRepo";
import { resolveReferredBy } from "@/lib/partners/partnersRepo";

export interface CreateBookingInput {
  waveId: string;
  ticketType: TicketType;
  headcount: number;
  leadName: string;
  leadEmail: string;
}

export type CreateBookingResult =
  | { ok: true; bookingId: string; clientSecret: string }
  | { ok: false; error: string };

export async function createBookingWithPaymentIntent(
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  const { waveId, ticketType, headcount, leadName, leadEmail } = input;

  if (!leadName.trim() || !leadEmail.trim()) {
    return { ok: false, error: "Name and email are required." };
  }
  if (!isValidTicketType(ticketType)) {
    return { ok: false, error: "Invalid ticket type." };
  }
  if (!isValidHeadcount(headcount)) {
    return { ok: false, error: "Party size must be between 1 and 5." };
  }

  const wave = await fetchWaveById(waveId);
  if (!wave) return { ok: false, error: "That start time no longer exists." };
  // Capacity is people: a group of four needs four spaces, and the picker's
  // view of this start time may be seconds stale, so re-check server-side.
  if (!hasRoomForGroup(wave, headcount)) {
    return {
      ok: false,
      error:
        wave.peopleLeft > 0
          ? `Only ${wave.peopleLeft} ${wave.peopleLeft === 1 ? "space" : "spaces"} left at that start time — pick another, or come as a smaller group.`
          : "That start time just filled up. Please pick another.",
    };
  }

  const amountCents = computeBookingTotalCents(ticketType, headcount);
  const manageToken = generateManageToken();
  const referredBy = await resolveReferredBy();

  const { data: booking, error: insertError } = await supabaseAdmin
    .from("bookings")
    .insert({
      wave_id: waveId,
      lead_name: leadName.trim(),
      lead_email: leadEmail.trim(),
      party_type: derivePartyTypeFromHeadcount(headcount),
      headcount,
      ticket_type: ticketType,
      amount_paid_cents: amountCents,
      currency: CURRENCY,
      status: "pending",
      manage_token: manageToken,
      referred_by: referredBy,
    })
    .select("id")
    .single();

  if (insertError || !booking) {
    console.error("createBookingWithPaymentIntent: booking insert failed:", insertError?.message);
    return { ok: false, error: "Couldn't create the booking. Please try again." };
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
