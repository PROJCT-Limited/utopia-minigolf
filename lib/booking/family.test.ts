// family.test.ts — the family ticket, end to end through the pure rules the
// picker (UI) and createBooking/reschedule (server) both use.
import { describe, it, expect, vi } from "vitest";
import {
  computeBookingTotalCents,
  computeDisplayTotalCents,
  computeWalkInTotalCents,
  describeTicket,
  familyTotalCents,
  isValidHeadcountFor,
  maxHeadcountFor,
  ticketRuleError,
  ticketTypesForDate,
  FAMILY_STARTS_BEFORE,
  LIST_PRICE_PER_PERSON_CENTS,
} from "./pricing";
import { isOfferable, toWaveView, type WaveRow } from "./waves";
import { hasRoomForGroup } from "./waveCapacity";

// waveCapacity.ts also holds the DB writes; only its pure capacity check is
// under test, so the client it would connect with is stubbed out.
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: {} }));
import { slotRuleFor } from "./slotRules";

const SEASON = "2026-11-20";

function wave(overrides: Partial<WaveRow> = {}) {
  return toWaveView({
    id: "w",
    date: SEASON,
    start_time: "18:45:00",
    people_capacity: 10,
    people_used: 0,
    wave_slots_used: 0,
    status: "confirmed",
    ...overrides,
  });
}

// headcount for a family = 2 adults + children
const family = (children: number) => 2 + children;

describe("family ticket: early only", () => {
  it("cuts off at 19:00", () => {
    expect(FAMILY_STARTS_BEFORE).toBe("19:00");
  });

  it("is accepted at 18:45 and rejected at 19:00 on the server", () => {
    expect(ticketRuleError("family", family(2), wave({ start_time: "18:45:00" }))).toBeNull();
    expect(ticketRuleError("family", family(2), wave({ start_time: "19:00:00" }))).toBe(
      "Family tickets are available before 19:00."
    );
  });

  it("is offered at 18:45 and not at 19:00 in the picker", () => {
    const rule = slotRuleFor("family");
    expect(isOfferable(wave({ start_time: "18:45:00" }), family(2), rule)).toBe(true);
    expect(isOfferable(wave({ start_time: "19:00:00" }), family(2), rule)).toBe(false);
    expect(rule?.note).toBe("Family tickets are available before 19:00");
    expect(rule?.label).toBe("Unavailable");
  });

  it("puts no time rule on Standard or Unlimited", () => {
    expect(slotRuleFor("standard")).toBeNull();
    expect(slotRuleFor("unlimited")).toBeNull();
    expect(ticketRuleError("standard", 2, wave({ start_time: "21:45:00" }))).toBeNull();
    expect(ticketRuleError("unlimited", 2, wave({ start_time: "21:45:00" }))).toBeNull();
  });

  // reschedule.ts runs ticketRuleError against the start time it's moving to.
  it("holds when rescheduling: a family can move to 16:00 but not to 19:00", () => {
    expect(ticketRuleError("family", family(3), wave({ start_time: "16:00:00" }))).toBeNull();
    expect(ticketRuleError("family", family(3), wave({ start_time: "19:00:00" }))).not.toBeNull();
  });
});

describe("family ticket: party", () => {
  it("rejects 1 child and 5 children", () => {
    expect(isValidHeadcountFor("family", family(1))).toBe(false);
    expect(isValidHeadcountFor("family", family(5))).toBe(false);
    expect(ticketRuleError("family", family(1), wave())).not.toBeNull();
    expect(ticketRuleError("family", family(5), wave())).not.toBeNull();
    expect(() => familyTotalCents(1)).toThrow();
    expect(() => familyTotalCents(5)).toThrow();
  });

  it("accepts 2 to 4 children", () => {
    for (const children of [2, 3, 4]) {
      expect(ticketRuleError("family", family(children), wave())).toBeNull();
    }
  });

  it("lets a party of 6 through for family but not for Standard", () => {
    expect(maxHeadcountFor("family")).toBe(6);
    expect(isValidHeadcountFor("family", 6)).toBe(true);
    expect(isValidHeadcountFor("standard", 6)).toBe(false);
    expect(ticketRuleError("standard", 6, wave())).not.toBeNull();
  });

  it("rejects a family of 6 at a start time with 5 spaces left", () => {
    const fiveLeft = wave({ people_capacity: 10, people_used: 5 });
    expect(hasRoomForGroup(fiveLeft, family(4))).toBe(false); // server
    expect(isOfferable(fiveLeft, family(4), slotRuleFor("family"))).toBe(false); // picker
    expect(hasRoomForGroup(fiveLeft, family(3))).toBe(true);
  });

  it("reads as 2 adults and N children", () => {
    expect(describeTicket("family", family(3))).toBe("Family ticket: 2 adults, 3 children");
    expect(describeTicket("standard", 3)).toBe("Standard");
  });
});

describe("family ticket: price", () => {
  it("is HKD 400 / 450 / 500 for 2 / 3 / 4 children", () => {
    expect(computeBookingTotalCents("family", family(2), SEASON)).toBe(400_00);
    expect(computeBookingTotalCents("family", family(3), SEASON)).toBe(450_00);
    expect(computeBookingTotalCents("family", family(4), SEASON)).toBe(500_00);
  });

  it("shows the guest the same figure it charges", () => {
    expect(computeDisplayTotalCents("family", family(3), false, SEASON)).toBe(450_00);
  });

  it("is never sold at the door", () => {
    expect(() => computeWalkInTotalCents("family", family(2), SEASON)).toThrow();
  });
});

describe("Standard and Unlimited are unchanged", () => {
  it("still price per person, 1 to 5 players", () => {
    expect(computeBookingTotalCents("standard", 3, SEASON)).toBe(3 * LIST_PRICE_PER_PERSON_CENTS.standard);
    expect(computeBookingTotalCents("unlimited", 5, SEASON)).toBe(5 * LIST_PRICE_PER_PERSON_CENTS.unlimited);
    expect(maxHeadcountFor("standard")).toBe(5);
    expect(maxHeadcountFor("unlimited")).toBe(5);
  });

  it("keeps the soft opening to Standard only — no family ticket either", () => {
    expect(ticketTypesForDate("2026-10-15")).toEqual(["standard"]);
  });
});
