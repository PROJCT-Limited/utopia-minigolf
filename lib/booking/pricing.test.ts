// pricing.test.ts
import { describe, it, expect } from "vitest";
import {
  computeBookingTotalCents,
  computeDisplayTotalCents,
  computeWalkInTotalCents,
  isSoftOpeningDate,
  isSoftOpeningOn,
  isTicketTypeOnSale,
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
// One play date on each side of the soft-opening line.
const SOFT = "2026-10-15";
const SEASON = "2026-11-05";

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
    expect(computeBookingTotalCents("standard", 1, SEASON, DURING)).toBe(15000);
    expect(computeBookingTotalCents("standard", 5, SEASON, DURING)).toBe(75000);
    expect(computeBookingTotalCents("unlimited", 1, SEASON, DURING)).toBe(22000);
    expect(computeBookingTotalCents("unlimited", 5, SEASON, DURING)).toBe(110000);
  });

  it("charges the door price after the deadline", () => {
    expect(computeBookingTotalCents("standard", 1, SEASON, AFTER)).toBe(17000);
    expect(computeBookingTotalCents("standard", 2, SEASON, AFTER)).toBe(34000);
    expect(computeBookingTotalCents("unlimited", 1, SEASON, AFTER)).toBe(24000);
    expect(computeBookingTotalCents("unlimited", 5, SEASON, AFTER)).toBe(120000);
  });

  it("rejects headcounts outside 1-5", () => {
    expect(() => computeBookingTotalCents("standard", 0, SEASON, DURING)).toThrow();
    expect(() => computeBookingTotalCents("standard", 6, SEASON, DURING)).toThrow();
    expect(() => computeBookingTotalCents("standard", 1.5, SEASON, DURING)).toThrow();
  });

  it("rejects invalid ticket types", () => {
    expect(() => computeBookingTotalCents("premium" as never, 2, SEASON, DURING)).toThrow();
  });
});

describe("computeWalkInTotalCents", () => {
  it("ignores the pre-booking price entirely — walk-ins pay the door price", () => {
    expect(computeWalkInTotalCents("standard", 2, SEASON)).toBe(34000);
    expect(computeWalkInTotalCents("unlimited", 2, SEASON)).toBe(48000);
  });

  it("charges the soft-opening price at the door on a soft-opening evening", () => {
    expect(computeWalkInTotalCents("standard", 2, SOFT)).toBe(20000);
    expect(computeWalkInTotalCents("unlimited", 2, SOFT)).toBe(30000);
  });

  it("still validates its inputs", () => {
    expect(() => computeWalkInTotalCents("standard", 9, SEASON)).toThrow();
    expect(() => computeWalkInTotalCents("premium" as never, 1, SEASON)).toThrow();
  });
});

describe("computeDisplayTotalCents", () => {
  it("follows the flag it is given, not any clock", () => {
    expect(computeDisplayTotalCents("standard", 3, true, SEASON)).toBe(45000);
    expect(computeDisplayTotalCents("standard", 3, false, SEASON)).toBe(51000);
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

describe("soft opening", () => {
  it("covers 8–22 Oct inclusive, by play date", () => {
    expect(isSoftOpeningDate("2026-10-07")).toBe(false);
    expect(isSoftOpeningDate("2026-10-08")).toBe(true);
    expect(isSoftOpeningDate("2026-10-22")).toBe(true);
    expect(isSoftOpeningDate("2026-10-23")).toBe(false);
  });

  it("charges the soft-opening price for a soft-opening evening, whenever it's bought", () => {
    expect(computeBookingTotalCents("standard", 2, SOFT, AFTER)).toBe(20000);
    expect(computeBookingTotalCents("unlimited", 3, SOFT, AFTER)).toBe(45000);
    expect(computeBookingTotalCents("standard", 1, SOFT, DURING)).toBe(10000);
    expect(computeDisplayTotalCents("unlimited", 1, false, SOFT)).toBe(15000);
  });

  it("stays on sale through the 22nd, Hong Kong time", () => {
    expect(isSoftOpeningOn(new Date("2026-10-22T23:59:00+08:00"))).toBe(true);
    expect(isSoftOpeningOn(new Date("2026-10-23T00:01:00+08:00"))).toBe(false);
  });
});

describe("tickets on sale", () => {
  it("sells only Standard for soft-opening evenings", () => {
    expect(isTicketTypeOnSale("standard", SOFT)).toBe(true);
    expect(isTicketTypeOnSale("unlimited", SOFT)).toBe(false);
  });

  it("sells both from the public launch", () => {
    expect(isTicketTypeOnSale("standard", SEASON)).toBe(true);
    expect(isTicketTypeOnSale("unlimited", SEASON)).toBe(true);
    expect(isTicketTypeOnSale("unlimited", "2026-10-23")).toBe(true);
  });
});
