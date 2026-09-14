// FILE: lib/booking/pricing.ts
// -----------------------------------------------------------------------------
// The golden rule: the booking wizard may *display* a total, but the number
// that's ever charged is recomputed here, on the server, from ticket type and
// headcount alone. The client total is decoration; this file is truth.
//
// The early bird price makes that rule matter more, not less. What a guest is
// shown depends on a deadline, and a browser clock can be set to anything —
// so the server decides whether the offer is live (`isEarlyBirdActive()`),
// hands the answer down as a prop, and recomputes the charge from its own
// clock at `createBooking`. A client is never asked what time it is.
// -----------------------------------------------------------------------------

export const TICKET_TYPES = ["standard", "unlimited"] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

// Standard: one run (all 5 stations) + 1 drink. Deliberately not described
// by a duration anywhere guest-facing — players aren't timed.
// Unlimited: a standing slot held for the full hour (re-entry every cycle) +
// bottomless drinks.
export const LIST_PRICE_PER_PERSON_CENTS: Record<TicketType, number> = {
  standard: 150_00,
  unlimited: 220_00,
};

// The early bird price: what pre-opening guests pay for booking a venue that
// isn't built yet, against a date that could still move.
export const EARLY_BIRD_PRICE_PER_PERSON_CENTS: Record<TicketType, number> = {
  standard: 120_00,
  unlimited: 180_00,
};

// End of 23 September 2026, Hong Kong time — a fortnight and a day before
// the doors open on 8 October, the same run-up the old 15 September deadline
// gave the old 30 September opening. Moving the season moved this with it.
// The offset is written into the literal on purpose: the server runs in UTC
// on Vercel, so an offset-less date string would close the offer eight hours
// early for everyone in HK.
export const EARLY_BIRD_ENDS_AT = new Date("2026-09-23T23:59:59+08:00");
export const EARLY_BIRD_DEADLINE_LABEL = "23 September";

/** The venue's clock. Every deadline a guest is shown is stated in it. */
export const VENUE_TIME_ZONE = "Asia/Hong_Kong";

/**
 * The deadline written out on the venue's clock — "23 Sept, 23:59 HKT".
 *
 * The countdown itself was never in the wrong timezone: it measures the gap
 * between two instants, which is the same number of seconds whether you read
 * it in Hong Kong or in Lisbon. What it couldn't do was *say* so, and a bare
 * "ends in 9 days" gives an overseas guest no way to tell whose midnight it
 * means. This derives the label from EARLY_BIRD_ENDS_AT through Intl rather
 * than spelling it out, so the words can never drift from the actual instant
 * — move the constant and the label moves with it.
 */
export function formatDeadlineInVenueTime(at: Date = EARLY_BIRD_ENDS_AT): string {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: VENUE_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);

  return `${formatted} HKT`;
}

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
 * Is the early bird price still live? Call this on the server — the default
 * argument is the machine's clock, and only the server's is trustworthy.
 */
export function isEarlyBirdActive(at: Date = new Date()): boolean {
  return at.getTime() <= EARLY_BIRD_ENDS_AT.getTime();
}

/** The per-person prices in force, given whether the early bird is live. */
export function priceTableFor(earlyBirdActive: boolean): Record<TicketType, number> {
  return earlyBirdActive ? EARLY_BIRD_PRICE_PER_PERSON_CENTS : LIST_PRICE_PER_PERSON_CENTS;
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
 * What to *show* a guest, given an early-bird flag the server worked out.
 * Display only — never the source of a charge.
 */
export function computeDisplayTotalCents(
  ticketType: TicketType,
  headcount: number,
  earlyBirdActive: boolean
): number {
  return totalFromTable(priceTableFor(earlyBirdActive), ticketType, headcount, "computeDisplayTotalCents");
}

/**
 * What to charge. Priced at the moment of purchase, from the server's clock.
 *
 * A Stripe PaymentIntent's amount is fixed when it's created, so someone who
 * reaches the payment step at 23:58 on the deadline and pays at 00:02 pays
 * the early bird price. That's deliberate — the alternative is repricing a
 * checkout underneath someone mid-payment.
 */
export function computeBookingTotalCents(
  ticketType: TicketType,
  headcount: number,
  at: Date = new Date()
): number {
  return totalFromTable(
    priceTableFor(isEarlyBirdActive(at)),
    ticketType,
    headcount,
    "computeBookingTotalCents"
  );
}

/**
 * List price, whatever the date. Walk-ins pay this: the early bird price buys
 * the risk of booking a venue that doesn't exist yet, and someone standing at
 * the door of one that plainly does is taking no such risk.
 */
export function computeListTotalCents(ticketType: TicketType, headcount: number): number {
  return totalFromTable(LIST_PRICE_PER_PERSON_CENTS, ticketType, headcount, "computeListTotalCents");
}
