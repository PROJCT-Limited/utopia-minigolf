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
  describeTicket,
  familyParty,
  isValidTicketType,
  ticketRuleError,
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
  /** Players in total. For a family, 2 adults + children — the children
      count, and so the price, are worked out from this on the server. */
  headcount: number;
  leadName: string;
  leadEmail: string;
}

export type CreateBookingResult =
  | { ok: true; bookingId: string; clientSecret: string }
  | { ok: false; error: string };

/** What shows against the charge in Stripe, so a payout can be read back. */
function describeBooking(
  ticketType: TicketType,
  headcount: number,
  wave: { date: string; timeLabel: string }
): string {
  const what = ticketType === "family" ? describeTicket(ticketType, headcount) : `${headcount} × ${describeTicket(ticketType, headcount)}`;
  return `FOUND · ${what} · ${wave.date} ${wave.timeLabel}`;
}

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

  const wave = await fetchWaveById(waveId);
  if (!wave) return { ok: false, error: "That start time no longer exists." };
  // Party size for the ticket, soft-opening tickets, and the family ticket's
  // early-only rule — the same check reschedule.ts runs.
  const ruleError = ticketRuleError(ticketType, headcount, wave);
  if (ruleError) return { ok: false, error: ruleError };
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

  const amountCents = computeBookingTotalCents(ticketType, headcount, wave.date);
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
      // A family's split, for reporting (bookings_family_party keeps it equal
      // to headcount). Only sent on family bookings, so Standard and Unlimited
      // keep working on a database that hasn't run 027_family_ticket.sql yet.
      ...(ticketType === "family"
        ? { adults_count: familyParty(headcount).adults, children_count: familyParty(headcount).children }
        : {}),
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
      // Cards only, deliberately. `automatic_payment_methods` let the
      // dashboard decide, and for HKD that resolved to card + Link — which
      // hands a returning guest an SMS code to fetch mid-checkout. Switching
      // apps to read it can cost them the page (see the sessionStorage
      // restore in BookingWizard), and every failed checkout in this
      // account's history is an intent no card was ever submitted against.
      // Apple Pay and Google Pay ride on the card type, so they stay.
      payment_method_types: ["card"],
      description: describeBooking(ticketType, headcount, wave),
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
