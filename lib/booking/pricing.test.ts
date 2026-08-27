// pricing.test.ts
import { describe, it, expect } from "vitest";
import {
  computeBookingTotalCents,
  isValidHeadcount,
  isValidTicketType,
  derivePartyTypeFromHeadcount,
  TICKET_PRICE_PER_PERSON_CENTS,
} from "./pricing";

describe("computeBookingTotalCents", () => {
  it("charges HKD 150 per person for standard", () => {
    expect(TICKET_PRICE_PER_PERSON_CENTS.standard).toBe(15000);
    expect(computeBookingTotalCents("standard", 1)).toBe(15000);
    expect(computeBookingTotalCents("standard", 2)).toBe(30000);
    expect(computeBookingTotalCents("standard", 5)).toBe(75000);
  });

  it("charges HKD 220 per person for unlimited", () => {
    expect(TICKET_PRICE_PER_PERSON_CENTS.unlimited).toBe(22000);
    expect(computeBookingTotalCents("unlimited", 1)).toBe(22000);
    expect(computeBookingTotalCents("unlimited", 5)).toBe(110000);
  });

  it("rejects headcounts outside 1-5", () => {
    expect(() => computeBookingTotalCents("standard", 0)).toThrow();
    expect(() => computeBookingTotalCents("standard", 6)).toThrow();
    expect(() => computeBookingTotalCents("standard", 1.5)).toThrow();
  });

  it("rejects invalid ticket types", () => {
    expect(() => computeBookingTotalCents("premium" as never, 2)).toThrow();
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

describe("isValidTicketType", () => {
  it("accepts standard and unlimited", () => {
    expect(isValidTicketType("standard")).toBe(true);
    expect(isValidTicketType("unlimited")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isValidTicketType("premium")).toBe(false);
    expect(isValidTicketType("")).toBe(false);
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
