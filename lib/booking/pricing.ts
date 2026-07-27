// FILE: lib/booking/pricing.ts
// -----------------------------------------------------------------------------
// The golden rule: the booking wizard may *display* a total, but the number
// that's ever charged is recomputed here, on the server, from headcount alone.
// The client total is decoration; this file is truth.
// -----------------------------------------------------------------------------

export const PRICE_PER_PERSON_CENTS = 160_00; // HKD 160
export const CURRENCY = "hkd";

export const PARTY_TYPE_HEADCOUNT_RANGE: Record<
  "solo" | "pair" | "group",
  { min: number; max: number }
> = {
  solo: { min: 1, max: 1 },
  pair: { min: 2, max: 2 },
  group: { min: 3, max: 4 },
};

export function isValidHeadcountForPartyType(
  partyType: "solo" | "pair" | "group",
  headcount: number
): boolean {
  const range = PARTY_TYPE_HEADCOUNT_RANGE[partyType];
  return Number.isInteger(headcount) && headcount >= range.min && headcount <= range.max;
}

export function computeBookingTotalCents(headcount: number): number {
  if (!Number.isInteger(headcount) || headcount < 1 || headcount > 4) {
    throw new Error(`computeBookingTotalCents: invalid headcount ${headcount}`);
  }
  return PRICE_PER_PERSON_CENTS * headcount;
}
