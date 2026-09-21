// pricing.test.ts
import { describe, it, expect } from "vitest";
import {
  computeBookingTotalCents,
  computeDisplayTotalCents,
  computeListTotalCents,
  isValidHeadcount,
  isValidTicketType,
  isPrebookingActive,
  derivePartyTypeFromHeadcount,
  VENUE_TIME_ZONE,
  priceTableFor,
  PREBOOKING_ENDS_AT,
  PREBOOKING_PRICE_PER_PERSON_CENTS,
  LIST_PRICE_PER_PERSON_CENTS,
} from "./pricing";

// Two instants that straddle the deadline, so no test depends on when it runs.
const DURING = new Date(PREBOOKING_ENDS_AT.getTime() - 60_000);
const AFTER = new Date(PREBOOKING_ENDS_AT.getTime() + 60_000);

describe("door prices", () => {
  it("is HKD 170 standard, HKD 240 unlimited from opening day", () => {
    expect(LIST_PRICE_PER_PERSON_CENTS.standard).toBe(17000);
    expect(LIST_PRICE_PER_PERSON_CENTS.unlimited).toBe(24000);
  });
});

describe("pre-booking price", () => {
  it("is HKD 150 standard, HKD 220 unlimited", () => {
    expect(PREBOOKING_PRICE_PER_PERSON_CENTS.standard).toBe(15000);
    expect(PREBOOKING_PRICE_PER_PERSON_CENTS.unlimited).toBe(22000);
  });

  it("undercuts the door price, which is the whole point of it", () => {
    expect(PREBOOKING_PRICE_PER_PERSON_CENTS.standard).toBeLessThan(LIST_PRICE_PER_PERSON_CENTS.standard);
    expect(PREBOOKING_PRICE_PER_PERSON_CENTS.unlimited).toBeLessThan(LIST_PRICE_PER_PERSON_CENTS.unlimited);
  });

  it("ends at the close of 7 October 2026 Hong Kong time", () => {
    // 23:59:59 +08:00 is 15:59:59Z the same day — the offset must survive,
    // or the offer would close eight hours early on a UTC server.
    expect(PREBOOKING_ENDS_AT.toISOString()).toBe("2026-10-07T15:59:59.000Z");
  });

  it("lands at midnight on the venue's own clock", () => {
    // The marker in the countdown strip says HKT; this is what makes that
    // true, whatever timezone the machine reading it happens to be in.
    expect(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: VENUE_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(PREBOOKING_ENDS_AT)
    ).toBe("23:59");
  });

  it("is live up to the deadline and not past it", () => {
    expect(isPrebookingActive(DURING)).toBe(true);
    expect(isPrebookingActive(PREBOOKING_ENDS_AT)).toBe(true);
    expect(isPrebookingActive(AFTER)).toBe(false);
  });

  it("picks the right price table either side of it", () => {
    expect(priceTableFor(true)).toBe(PREBOOKING_PRICE_PER_PERSON_CENTS);
    expect(priceTableFor(false)).toBe(LIST_PRICE_PER_PERSON_CENTS);
  });
});

describe("computeBookingTotalCents", () => {
  it("charges the pre-booking price before the deadline", () => {
    expect(computeBookingTotalCents("standard", 1, DURING)).toBe(15000);
    expect(computeBookingTotalCents("standard", 5, DURING)).toBe(75000);
    expect(computeBookingTotalCents("unlimited", 1, DURING)).toBe(22000);
    expect(computeBookingTotalCents("unlimited", 5, DURING)).toBe(110000);
  });

  it("charges the door price after the deadline", () => {
    expect(computeBookingTotalCents("standard", 1, AFTER)).toBe(17000);
    expect(computeBookingTotalCents("standard", 2, AFTER)).toBe(34000);
    expect(computeBookingTotalCents("unlimited", 1, AFTER)).toBe(24000);
    expect(computeBookingTotalCents("unlimited", 5, AFTER)).toBe(120000);
  });

  it("rejects headcounts outside 1-5", () => {
    expect(() => computeBookingTotalCents("standard", 0, DURING)).toThrow();
    expect(() => computeBookingTotalCents("standard", 6, DURING)).toThrow();
    expect(() => computeBookingTotalCents("standard", 1.5, DURING)).toThrow();
  });

  it("rejects invalid ticket types", () => {
    expect(() => computeBookingTotalCents("premium" as never, 2, DURING)).toThrow();
  });
});

describe("computeListTotalCents", () => {
  it("ignores the pre-booking price entirely — walk-ins pay the door price", () => {
    expect(computeListTotalCents("standard", 2)).toBe(34000);
    expect(computeListTotalCents("unlimited", 2)).toBe(48000);
  });

  it("still validates its inputs", () => {
    expect(() => computeListTotalCents("standard", 9)).toThrow();
    expect(() => computeListTotalCents("premium" as never, 1)).toThrow();
  });
});

describe("computeDisplayTotalCents", () => {
  it("follows the flag it is given, not any clock", () => {
    expect(computeDisplayTotalCents("standard", 3, true)).toBe(45000);
    expect(computeDisplayTotalCents("standard", 3, false)).toBe(51000);
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
