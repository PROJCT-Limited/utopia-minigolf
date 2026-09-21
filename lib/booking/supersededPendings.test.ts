import { describe, it, expect } from "vitest";
import { findSupersededPendings, type SweepableBooking } from "./supersededPendings";

const NOW = new Date("2026-09-21T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

function booking(overrides: Partial<SweepableBooking> = {}): SweepableBooking {
  return {
    id: "b1",
    status: "pending",
    lead_email: "zubin.hk@gmail.com",
    lead_name: "Zubin Arenja",
    created_at: hoursAgo(50),
    ...overrides,
  };
}

describe("findSupersededPendings", () => {
  it("clears the attempts someone made before they got through", () => {
    const ids = findSupersededPendings(
      [
        booking({ id: "try1", created_at: hoursAgo(58) }),
        booking({ id: "try2", created_at: hoursAgo(57) }),
        booking({ id: "done", status: "paid", created_at: hoursAgo(33) }),
      ],
      NOW
    );

    expect(ids).toEqual(["try1", "try2"]);
  });

  it("counts a payment on any start time, not just the one abandoned", () => {
    // Marin abandoned one slot at 18:51 and booked a different one at 00:52.
    // The first attempt is just as dead.
    const ids = findSupersededPendings(
      [
        booking({ id: "other-slot", lead_email: "marin@example.com", lead_name: "Marin" }),
        booking({
          id: "paid",
          status: "paid",
          lead_email: "marin@example.com",
          lead_name: "Marin",
          created_at: hoursAgo(44),
        }),
      ],
      NOW
    );

    expect(ids).toEqual(["other-slot"]);
  });

  it("leaves alone someone who never paid", () => {
    const ids = findSupersededPendings([booking({ id: "abandoned" })], NOW);
    expect(ids).toEqual([]);
  });

  it("keeps a checkout started after the payment", () => {
    // Book Friday, pay, then start on Saturday — the second is a new
    // intention, not a leftover from the first.
    const ids = findSupersededPendings(
      [
        booking({ id: "paid-first", status: "paid", created_at: hoursAgo(50) }),
        booking({ id: "started-after", created_at: hoursAgo(40) }),
      ],
      NOW
    );

    expect(ids).toEqual([]);
  });

  it("won't touch a checkout that could still be on screen", () => {
    const ids = findSupersededPendings(
      [
        booking({ id: "fresh", created_at: hoursAgo(0.5) }),
        booking({ id: "paid", status: "paid", created_at: hoursAgo(0.2) }),
      ],
      NOW
    );

    expect(ids).toEqual([]);
  });

  it("treats a different person at the same address as a different person", () => {
    const ids = findSupersededPendings(
      [
        booking({ id: "her", lead_email: "house@example.com", lead_name: "Ada" }),
        booking({
          id: "his",
          status: "paid",
          lead_email: "house@example.com",
          lead_name: "Bram",
          created_at: hoursAgo(10),
        }),
      ],
      NOW
    );

    expect(ids).toEqual([]);
  });

  it("ignores rows with no email, since a walk-in can't be matched", () => {
    const ids = findSupersededPendings(
      [
        booking({ id: "walkin", lead_email: null }),
        booking({ id: "paid", status: "paid", lead_email: null, created_at: hoursAgo(10) }),
      ],
      NOW
    );

    expect(ids).toEqual([]);
  });

  it("matches regardless of case and stray spacing", () => {
    const ids = findSupersededPendings(
      [
        booking({ id: "typed-oddly", lead_email: "  Zubin.HK@gmail.com ", lead_name: " zubin arenja " }),
        booking({ id: "paid", status: "paid", created_at: hoursAgo(10) }),
      ],
      NOW
    );

    expect(ids).toEqual(["typed-oddly"]);
  });

  it("never returns a cancelled row", () => {
    const ids = findSupersededPendings(
      [
        booking({ id: "already-cancelled", status: "cancelled" }),
        booking({ id: "paid", status: "paid", created_at: hoursAgo(10) }),
      ],
      NOW
    );

    expect(ids).toEqual([]);
  });
});
