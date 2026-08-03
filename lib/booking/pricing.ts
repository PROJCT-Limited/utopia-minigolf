// FILE: lib/booking/pricing.ts
// -----------------------------------------------------------------------------
// The golden rule: the booking wizard may *display* a total, but the number
// that's ever charged is recomputed here, on the server, from headcount alone.
// The client total is decoration; this file is truth.
// -----------------------------------------------------------------------------

export const PRICE_PER_PERSON_CENTS = 160_00; // HKD 160
export const CURRENCY = "hkd";

export const MIN_PRIVATE_GROUP_HEADCOUNT = 1;
export const MAX_PRIVATE_GROUP_HEADCOUNT = 5;

export function isValidHeadcount(headcount: number): boolean {
  return (
    Number.isInteger(headcount) &&
    headcount >= MIN_PRIVATE_GROUP_HEADCOUNT &&
    headcount <= MAX_PRIVATE_GROUP_HEADCOUNT
  );
}

// party_type is no longer a guest choice — the booking wizard just asks for
// headcount — but the column stays (bookings.party_type, still read by
// admin/emails/confirmation) so it's derived here rather than dropped.
export function derivePartyTypeFromHeadcount(headcount: number): "solo" | "pair" | "group" {
  if (headcount === 1) return "solo";
  if (headcount === 2) return "pair";
  return "group";
}

export function computeBookingTotalCents(headcount: number): number {
  if (!isValidHeadcount(headcount)) {
    throw new Error(`computeBookingTotalCents: invalid headcount ${headcount}`);
  }
  return PRICE_PER_PERSON_CENTS * headcount;
}
