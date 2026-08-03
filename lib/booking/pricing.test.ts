// pricing.test.ts
import { describe, it, expect } from "vitest";
import {
  computeBookingTotalCents,
  isValidHeadcount,
  derivePartyTypeFromHeadcount,
  PRICE_PER_PERSON_CENTS,
} from "./pricing";

describe("computeBookingTotalCents", () => {
  it("charges HKD 160 per person", () => {
    expect(PRICE_PER_PERSON_CENTS).toBe(16000);
    expect(computeBookingTotalCents(1)).toBe(16000);
    expect(computeBookingTotalCents(2)).toBe(32000);
    expect(computeBookingTotalCents(5)).toBe(80000);
  });

  it("rejects headcounts outside 1-5", () => {
    expect(() => computeBookingTotalCents(0)).toThrow();
    expect(() => computeBookingTotalCents(6)).toThrow();
    expect(() => computeBookingTotalCents(1.5)).toThrow();
  });
});

describe("isValidHeadcount", () => {
  it("accepts 1 through 5", () => {
    expect(isValidHeadcount(1)).toBe(true);
    expect(isValidHeadcount(5)).toBe(true);
  });

  it("rejects outside that range or non-integers", () => {
    expect(isValidHeadcount(0)).toBe(false);
    expect(isValidHeadcount(6)).toBe(false);
    expect(isValidHeadcount(2.5)).toBe(false);
  });
});

describe("derivePartyTypeFromHeadcount", () => {
  it("maps 1 to solo, 2 to pair, 3+ to group", () => {
    expect(derivePartyTypeFromHeadcount(1)).toBe("solo");
    expect(derivePartyTypeFromHeadcount(2)).toBe("pair");
    expect(derivePartyTypeFromHeadcount(3)).toBe("group");
    expect(derivePartyTypeFromHeadcount(5)).toBe("group");
  });
});
