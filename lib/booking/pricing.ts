// FILE: lib/booking/pricing.ts
// -----------------------------------------------------------------------------
// The golden rule: the booking wizard may *display* a total, but the number
// that's ever charged is recomputed here, on the server, from ticket type and
// headcount alone. The client total is decoration; this file is truth.
// -----------------------------------------------------------------------------

export const TICKET_TYPES = ["standard", "unlimited"] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

// Standard: one run (all 5 stations) + 1 drink. Deliberately not described
// by a duration anywhere guest-facing — players aren't timed.
// Unlimited: a standing slot held for the full hour (re-entry every cycle) +
// bottomless drinks.
export const TICKET_PRICE_PER_PERSON_CENTS: Record<TicketType, number> = {
  standard: 150_00,
  unlimited: 220_00,
};

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

export function computeBookingTotalCents(ticketType: TicketType, headcount: number): number {
  if (!isValidTicketType(ticketType)) {
    throw new Error(`computeBookingTotalCents: invalid ticket type ${ticketType}`);
  }
  if (!isValidHeadcount(headcount)) {
    throw new Error(`computeBookingTotalCents: invalid headcount ${headcount}`);
  }
  return TICKET_PRICE_PER_PERSON_CENTS[ticketType] * headcount;
}
