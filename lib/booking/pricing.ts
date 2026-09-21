// FILE: lib/booking/pricing.ts
// -----------------------------------------------------------------------------
// The golden rule: the booking wizard may *display* a total, but the number
// that's ever charged is recomputed here, on the server, from ticket type and
// headcount alone. The client total is decoration; this file is truth.
//
// The pre-booking price makes that rule matter more, not less. What a guest is
// shown depends on a deadline, and a browser clock can be set to anything —
// so the server decides whether the window is open (`isPrebookingActive()`),
// hands the answer down as a prop, and recomputes the charge from its own
// clock at `createBooking`. A client is never asked what time it is.
// -----------------------------------------------------------------------------

export const TICKET_TYPES = ["standard", "unlimited"] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

// Standard: one run (all 5 stations) + 1 drink. Deliberately not described
// by a duration anywhere guest-facing — players aren't timed.
// Unlimited: a standing slot held for the full hour (re-entry every cycle) +
// bottomless drinks.
//
// The door price, charged from opening day and to every walk-in. Until the
// doors open it is the price a booking *becomes*, not one anybody pays.
export const LIST_PRICE_PER_PERSON_CENTS: Record<TicketType, number> = {
  standard: 170_00,
  unlimited: 240_00,
};

// The pre-booking price: what you pay for committing to a venue before it
// opens. It succeeded the early bird price (120/180), which ran until
// 20 September and is closed — bookings made under it keep what they paid,
// since a charge is stored on the booking, never recomputed.
export const PREBOOKING_PRICE_PER_PERSON_CENTS: Record<TicketType, number> = {
  standard: 150_00,
  unlimited: 220_00,
};

// End of 7 October 2026, Hong Kong time — the last night before the doors
// open on the 8th. The offset is written into the literal on purpose: the
// server runs in UTC on Vercel, so an offset-less date string would close the
// window eight hours early for everyone in HK.
export const PREBOOKING_ENDS_AT = new Date("2026-10-07T23:59:59+08:00");
export const PREBOOKING_DEADLINE_LABEL = "7 October";

/**
 * The venue's clock, and the two-letter answer to "whose midnight?".
 *
 * The countdown was never in the wrong timezone — it measures the gap between
 * two instants, the same number of seconds in Hong Kong as in Lisbon, and the
 * deadline above carries +08:00. What it couldn't do was say so, which is all
 * this marker is for: the digits are the headline, and HKT is the footnote
 * that tells a guest abroad which midnight they're counting down to.
 */
export const VENUE_TIME_ZONE = "Asia/Hong_Kong";
export const VENUE_TIME_ZONE_LABEL = "HKT";

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  standard: "Standard",
  unlimited: "Unlimited",
};

export const CURRENCY = "hkd";

// A booking is just a booking — one person or a group of up to five. How
// many tickets you buy is the only difference between them.
export const MIN_HEADCOUNT = 1;
export const MAX_HEADCOUNT = 5;

export function isValidHeadcount(headcount: number): boolean {
  return (
    Number.isInteger(headcount) &&
    headcount >= MIN_HEADCOUNT &&
    headcount <= MAX_HEADCOUNT
  );
}

export function isValidTicketType(value: string): value is TicketType {
  return (TICKET_TYPES as readonly string[]).includes(value);
}

// party_type is no longer a guest choice — the booking wizard just asks for
// headcount — but the column stays (bookings.party_type, still read by
// admin/emails/confirmation) so it's derived here rather than dropped.
export function derivePartyTypeFromHeadcount(headcount: number): "solo" | "pair" | "group" {
  if (headcount === 1) return "solo";
  if (headcount === 2) return "pair";
  return "group";
}

/**
 * Is the pre-booking price still live? Call this on the server — the default
 * argument is the machine's clock, and only the server's is trustworthy.
 */
export function isPrebookingActive(at: Date = new Date()): boolean {
  return at.getTime() <= PREBOOKING_ENDS_AT.getTime();
}

/** The per-person prices in force, given whether pre-booking is still open. */
export function priceTableFor(prebookingActive: boolean): Record<TicketType, number> {
  return prebookingActive ? PREBOOKING_PRICE_PER_PERSON_CENTS : LIST_PRICE_PER_PERSON_CENTS;
}

function totalFromTable(
  table: Record<TicketType, number>,
  ticketType: TicketType,
  headcount: number,
  caller: string
): number {
  if (!isValidTicketType(ticketType)) {
    throw new Error(`${caller}: invalid ticket type ${ticketType}`);
  }
  if (!isValidHeadcount(headcount)) {
    throw new Error(`${caller}: invalid headcount ${headcount}`);
  }
  return table[ticketType] * headcount;
}

/**
 * What to *show* a guest, given a pre-booking flag the server worked out.
 * Display only — never the source of a charge.
 */
export function computeDisplayTotalCents(
  ticketType: TicketType,
  headcount: number,
  prebookingActive: boolean
): number {
  return totalFromTable(priceTableFor(prebookingActive), ticketType, headcount, "computeDisplayTotalCents");
}

/**
 * What to charge. Priced at the moment of purchase, from the server's clock.
 *
 * A Stripe PaymentIntent's amount is fixed when it's created, so someone who
 * reaches the payment step at 23:58 on the deadline and pays at 00:02 pays
 * the pre-booking price. That's deliberate — the alternative is repricing a
 * checkout underneath someone mid-payment.
 */
export function computeBookingTotalCents(
  ticketType: TicketType,
  headcount: number,
  at: Date = new Date()
): number {
  return totalFromTable(
    priceTableFor(isPrebookingActive(at)),
    ticketType,
    headcount,
    "computeBookingTotalCents"
  );
}

/**
 * Door price, whatever the date. Walk-ins pay this: the pre-booking price buys
 * the risk of committing to a venue that isn't open yet, and someone standing
 * at the door of one that plainly is takes no such risk.
 */
export function computeListTotalCents(ticketType: TicketType, headcount: number): number {
  return totalFromTable(LIST_PRICE_PER_PERSON_CENTS, ticketType, headcount, "computeListTotalCents");
}
