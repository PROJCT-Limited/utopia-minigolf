// activeWindow.test.ts
import { describe, it, expect } from "vitest";
import { isCurrentlyActive, waveStartInstant, todayInHongKong, ROUND_DURATION_MINUTES } from "./activeWindow";

const WAVE = { date: "2026-10-05", startTime: "16:00:00" };

describe("waveStartInstant", () => {
  it("interprets the date/time as Hong Kong local (UTC+8)", () => {
    const start = waveStartInstant(WAVE.date, WAVE.startTime);
    expect(start.toISOString()).toBe("2026-10-05T08:00:00.000Z"); // 16:00 HKT = 08:00 UTC
  });
});

describe("isCurrentlyActive", () => {
  it("is false well before the check-in window opens", () => {
    const now = new Date("2026-10-05T07:00:00.000Z"); // 15:00 HKT, an hour early
    expect(isCurrentlyActive(WAVE, "standard", now)).toBe(false);
  });

  it("is true once the check-in buffer opens, before the round starts", () => {
    const now = new Date("2026-10-05T07:55:00.000Z"); // 15:55 HKT, 5 min before start
    expect(isCurrentlyActive(WAVE, "standard", now)).toBe(true);
  });

  it("is true during a standard round", () => {
    const now = new Date("2026-10-05T08:15:00.000Z"); // 16:15 HKT, mid-round
    expect(isCurrentlyActive(WAVE, "standard", now)).toBe(true);
  });

  it("is false after a standard round's wrap-up buffer expires", () => {
    // Standard = 30 min + 15 min wrap-up = active until 16:45 HKT.
    const stillWithin = new Date("2026-10-05T08:44:00.000Z");
    const justAfter = new Date("2026-10-05T08:46:00.000Z");
    expect(isCurrentlyActive(WAVE, "standard", stillWithin)).toBe(true);
    expect(isCurrentlyActive(WAVE, "standard", justAfter)).toBe(false);
  });

  it("stays active longer for an unlimited round than a standard one", () => {
    // 16:00 + 60 min + 15 min wrap-up = active until 17:15 HKT — well past
    // when a standard round (active until 16:45) would have closed.
    const now = new Date("2026-10-05T09:00:00.000Z"); // 17:00 HKT
    expect(isCurrentlyActive(WAVE, "standard", now)).toBe(false);
    expect(isCurrentlyActive(WAVE, "unlimited", now)).toBe(true);
  });

  it("exposes the duration each ticket type actually uses", () => {
    expect(ROUND_DURATION_MINUTES.standard).toBe(30);
    expect(ROUND_DURATION_MINUTES.unlimited).toBe(60);
  });
});

describe("todayInHongKong", () => {
  it("returns the Hong Kong calendar date even when UTC is still on the previous day", () => {
    // 23:30 UTC on Oct 5 is already 07:30 HKT on Oct 6.
    const lateUtc = new Date("2026-10-05T23:30:00.000Z");
    expect(todayInHongKong(lateUtc)).toBe("2026-10-06");
  });

  it("returns the same date when UTC and Hong Kong agree on the calendar day", () => {
    const midday = new Date("2026-10-05T04:00:00.000Z"); // 12:00 HKT
    expect(todayInHongKong(midday)).toBe("2026-10-05");
  });
});
