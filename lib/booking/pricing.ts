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

import { todayInHongKong } from "@/lib/scoring/activeWindow";

// Standard and Unlimited are priced per person; Family is one price for the
// party (see FAMILY_* below), so it has no row in the per-person tables and is
// never sold at the door.
export const PER_PERSON_TICKET_TYPES = ["standard", "unlimited"] as const;
export type PerPersonTicketType = (typeof PER_PERSON_TICKET_TYPES)[number];
export const TICKET_TYPES = [...PER_PERSON_TICKET_TYPES, "family"] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export function isPerPersonTicketType(value: string): value is PerPersonTicketType {
  return (PER_PERSON_TICKET_TYPES as readonly string[]).includes(value);
}

// Standard: one run (all 5 stations) + 1 drink. Deliberately not described
// by a duration anywhere guest-facing — players aren't timed.
// Unlimited: a standing slot held for the full hour (re-entry every cycle) +
// bottomless drinks.
//
// The door price, charged from opening day and to every walk-in. Until the
// doors open it is the price a booking *becomes*, not one anybody pays.
export const LIST_PRICE_PER_PERSON_CENTS: Record<PerPersonTicketType, number> = {
  standard: 170_00,
  unlimited: 240_00,
};

// The pre-booking price: what you pay for committing to a venue before it
// opens. It succeeded the early bird price (120/180), which ran until
// 20 September and is closed — bookings made under it keep what they paid,
// since a charge is stored on the booking, never recomputed.
export const PREBOOKING_PRICE_PER_PERSON_CENTS: Record<PerPersonTicketType, number> = {
  standard: 150_00,
  unlimited: 220_00,
};

// End of 7 October 2026, Hong Kong time — the last night before the doors
// open on the 8th. The offset is written into the literal on purpose: the
// server runs in UTC on Vercel, so an offset-less date string would close the
// window eight hours early for everyone in HK.
export const PREBOOKING_ENDS_AT = new Date("2026-10-07T23:59:59+08:00");
export const PREBOOKING_DEADLINE_LABEL = "7 October";

// The soft opening: 8–22 Oct, 6–9pm, a few people per start time, while the
// scoring sensors are still being tuned. Every station plays, but the counter
// doesn't always react, so these evenings sell for less.
//
// Unlike the pre-booking price this goes by the date you PLAY, not the date
// you buy — booking a November evening today costs the door price, and
// turning up on the 15th without a booking costs the soft-opening one.
// Only one round is sold during the soft opening (see isTicketTypeOnSale) — an
// hour of play is a lot to ask while the scoring is still being tuned. The
// Unlimited figure keeps the table whole and is never charged.
export const SOFT_OPENING_PRICE_PER_PERSON_CENTS: Record<PerPersonTicketType, number> = {
  standard: 100_00,
  unlimited: 150_00,
};
export const SOFT_OPENING_FIRST_DATE = "2026-10-08";
export const SOFT_OPENING_LAST_DATE = "2026-10-22";
export const SOFT_OPENING_LABEL = "8–22 Oct";
export const PUBLIC_LAUNCH_LABEL = "23 Oct";

/** Is this play date ("YYYY-MM-DD") part of the soft opening? */
export function isSoftOpeningDate(date: string): boolean {
  return date >= SOFT_OPENING_FIRST_DATE && date <= SOFT_OPENING_LAST_DATE;
}

/** Which tickets can be bought for a play date: just Standard during the soft opening. */
export function ticketTypesForDate(date: string): readonly TicketType[] {
  return isSoftOpeningDate(date) ? ["standard"] : TICKET_TYPES;
}

export function isTicketTypeOnSale(ticketType: TicketType, date: string): boolean {
  return ticketTypesForDate(date).includes(ticketType);
}

// ---------- Family ticket ----------
// Two adults (18+) and two to four children (3 to 11), one round, early
// only. One price covers the two adults and the first two children; each child
// after that adds a flat amount. Not touched by pre-booking or soft-opening
// pricing, and never sold at the door.
export const FAMILY_ADULTS = 2;
export const FAMILY_MIN_CHILDREN = 2;
export const FAMILY_MAX_CHILDREN = 4;
export const FAMILY_BASE_PRICE_CENTS = 400_00;
export const FAMILY_EXTRA_CHILD_CENTS = 50_00;

/**
 * Family bookings must START before this time, Hong Kong time ("HH:MM").
 * Start times are stored as naive HK wall-clock strings, so this compares as
 * text. The venue opens at 17:00, so families get the first two hours of
 * the evening; this is the one value to change if that moves.
 */
export const FAMILY_STARTS_BEFORE = "19:00";

export function isValidFamilyChildren(children: number): boolean {
  return Number.isInteger(children) && children >= FAMILY_MIN_CHILDREN && children <= FAMILY_MAX_CHILDREN;
}

/** HKD cents for a family of two adults and `children` children. */
export function familyTotalCents(children: number): number {
  if (!isValidFamilyChildren(children)) {
    throw new Error(`familyTotalCents: invalid children count ${children}`);
  }
  return FAMILY_BASE_PRICE_CENTS + FAMILY_EXTRA_CHILD_CENTS * (children - FAMILY_MIN_CHILDREN);
}

/**
 * A family booking's adults and children, read off its headcount. Safe
 * because adults are always FAMILY_ADULTS, and bookings_family_party
 * (migrations/027) holds headcount = adults_count + children_count.
 */
export function familyParty(headcount: number): { adults: number; children: number } {
  return { adults: FAMILY_ADULTS, children: headcount - FAMILY_ADULTS };
}

/** Is a start time ("HH:MM" or "HH:MM:SS") allowed for this ticket type? */
export function isStartTimeAllowedFor(ticketType: TicketType, startTime: string): boolean {
  return ticketType !== "family" || startTime.slice(0, 5) < FAMILY_STARTS_BEFORE;
}

/** The largest party this ticket type can be booked for. */
export function maxHeadcountFor(ticketType: TicketType): number {
  return ticketType === "family" ? FAMILY_ADULTS + FAMILY_MAX_CHILDREN : MAX_HEADCOUNT;
}

/** The smallest party this ticket type can be booked for. */
export function minHeadcountFor(ticketType: TicketType): number {
  return ticketType === "family" ? FAMILY_ADULTS + FAMILY_MIN_CHILDREN : MIN_HEADCOUNT;
}

export function isValidHeadcountFor(ticketType: TicketType, headcount: number): boolean {
  return ticketType === "family"
    ? isValidFamilyChildren(headcount - FAMILY_ADULTS)
    : isValidHeadcount(headcount);
}

/**
 * Why this party can't book this start time, or null if it can. The ticket
 * rules only — capacity is checked separately against live numbers. Shared by
 * createBooking and reschedule so the two can't disagree.
 */
export function ticketRuleError(
  ticketType: TicketType,
  headcount: number,
  wave: { date: string; startTime: string }
): string | null {
  if (!isValidHeadcountFor(ticketType, headcount)) {
    return ticketType === "family"
      ? `A family ticket is ${FAMILY_ADULTS} adults and ${FAMILY_MIN_CHILDREN} to ${FAMILY_MAX_CHILDREN} children.`
      : `Party size must be between ${MIN_HEADCOUNT} and ${MAX_HEADCOUNT}.`;
  }
  if (!isTicketTypeOnSale(ticketType, wave.date)) {
    return `Only one round (Standard) is on sale for soft-opening evenings, ${SOFT_OPENING_LABEL}.`;
  }
  if (!isStartTimeAllowedFor(ticketType, wave.startTime)) {
    return `Family tickets are available before ${FAMILY_STARTS_BEFORE}.`;
  }
  return null;
}

/** "Family ticket: 2 adults, 3 children", or just the ticket's name. */
export function describeTicket(ticketType: TicketType, headcount: number): string {
  if (ticketType !== "family") return TICKET_TYPE_LABELS[ticketType];
  const { adults, children } = familyParty(headcount);
  return `${TICKET_TYPE_LABELS.family}: ${adults} adults, ${children} ${children === 1 ? "child" : "children"}`;
}

/** Is the soft opening still running at the venue, i.e. are its prices still on sale? */
export function isSoftOpeningOn(now: Date = new Date()): boolean {
  return todayInHongKong(now) <= SOFT_OPENING_LAST_DATE;
}

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
  family: "Family ticket",
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
export function priceTableFor(prebookingActive: boolean): Record<PerPersonTicketType, number> {
  return prebookingActive ? PREBOOKING_PRICE_PER_PERSON_CENTS : LIST_PRICE_PER_PERSON_CENTS;
}

/** The per-person prices for one play date. The soft opening wins over everything. */
export function priceTableForDate(date: string, prebookingActive: boolean): Record<PerPersonTicketType, number> {
  return isSoftOpeningDate(date) ? SOFT_OPENING_PRICE_PER_PERSON_CENTS : priceTableFor(prebookingActive);
}

function totalFromTable(
  table: Record<PerPersonTicketType, number>,
  ticketType: TicketType,
  headcount: number,
  caller: string
): number {
  if (!isValidTicketType(ticketType)) {
    throw new Error(`${caller}: invalid ticket type ${ticketType}`);
  }
  if (!isValidHeadcountFor(ticketType, headcount)) {
    throw new Error(`${caller}: invalid headcount ${headcount}`);
  }
  if (ticketType === "family") return familyTotalCents(familyParty(headcount).children);
  return table[ticketType] * headcount;
}

/**
 * What to *show* a guest, given a pre-booking flag the server worked out.
 * Display only — never the source of a charge.
 */
export function computeDisplayTotalCents(
  ticketType: TicketType,
  headcount: number,
  prebookingActive: boolean,
  date: string
): number {
  return totalFromTable(priceTableForDate(date, prebookingActive), ticketType, headcount, "computeDisplayTotalCents");
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
  date: string,
  at: Date = new Date()
): number {
  return totalFromTable(
    priceTableForDate(date, isPrebookingActive(at)),
    ticketType,
    headcount,
    "computeBookingTotalCents"
  );
}

/** What a walk-in pays per person on a given play date. */
export function walkInPriceTable(date: string): Record<PerPersonTicketType, number> {
  return isSoftOpeningDate(date) ? SOFT_OPENING_PRICE_PER_PERSON_CENTS : LIST_PRICE_PER_PERSON_CENTS;
}

/**
 * Door price. Walk-ins never get the pre-booking price — it buys the risk of
 * committing to a venue that isn't open yet, and someone standing at the door
 * of one that plainly is takes no such risk. The soft-opening price is about
 * the evening itself, so it applies at the door the same as online.
 */
export function computeWalkInTotalCents(ticketType: TicketType, headcount: number, date: string): number {
  if (!isPerPersonTicketType(ticketType)) {
    throw new Error(`computeWalkInTotalCents: ${ticketType} isn't sold at the door`);
  }
  return totalFromTable(walkInPriceTable(date), ticketType, headcount, "computeWalkInTotalCents");
}
