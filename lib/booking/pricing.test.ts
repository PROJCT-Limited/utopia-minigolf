// pricing.test.ts
import { describe, it, expect } from "vitest";
import {
  computeBookingTotalCents,
  isValidHeadcountForPartyType,
  PRICE_PER_PERSON_CENTS,
} from "./pricing";

describe("computeBookingTotalCents", () => {
  it("charges HKD 160 per person", () => {
    expect(PRICE_PER_PERSON_CENTS).toBe(16000);
    expect(computeBookingTotalCents(1)).toBe(16000);
    expect(computeBookingTotalCents(2)).toBe(32000);
    expect(computeBookingTotalCents(4)).toBe(64000);
  });

  it("rejects headcounts outside 1-4", () => {
    expect(() => computeBookingTotalCents(0)).toThrow();
    expect(() => computeBookingTotalCents(5)).toThrow();
    expect(() => computeBookingTotalCents(1.5)).toThrow();
  });
});

describe("isValidHeadcountForPartyType", () => {
  it("solo is exactly 1", () => {
    expect(isValidHeadcountForPartyType("solo", 1)).toBe(true);
    expect(isValidHeadcountForPartyType("solo", 2)).toBe(false);
  });

  it("pair is exactly 2", () => {
    expect(isValidHeadcountForPartyType("pair", 2)).toBe(true);
    expect(isValidHeadcountForPartyType("pair", 1)).toBe(false);
    expect(isValidHeadcountForPartyType("pair", 3)).toBe(false);
  });

  it("group is 3-4", () => {
    expect(isValidHeadcountForPartyType("group", 3)).toBe(true);
    expect(isValidHeadcountForPartyType("group", 4)).toBe(true);
    expect(isValidHeadcountForPartyType("group", 2)).toBe(false);
    expect(isValidHeadcountForPartyType("group", 5)).toBe(false);
  });
});
