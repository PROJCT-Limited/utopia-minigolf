// checkin.test.ts
import { describe, it, expect } from "vitest";
import {
  normalizeBallTag,
  isValidBallTag,
  formatBallTag,
  rosterProgress,
  isValidPresentHeadcount,
  normalizePlayerName,
  isValidPlayerName,
  pickWalkInWave,
  matchesSearch,
} from "./checkin";

describe("normalizeBallTag", () => {
  it("folds the shapes one reader vs. another emits for the same ball", () => {
    // Keyboard-wedge readers append a newline; staff type the "#" off the
    // sticker; some readers lower-case their hex.
    expect(normalizeBallTag("a2")).toBe("A2");
    expect(normalizeBallTag("#A2")).toBe("A2");
    expect(normalizeBallTag(" A2\r\n")).toBe("A2");
    expect(normalizeBallTag("04 A2 3B")).toBe("04A23B");
  });
});

describe("isValidBallTag", () => {
  it("accepts short sticker codes and full reader hex alike", () => {
    expect(isValidBallTag("A2")).toBe(true);
    expect(isValidBallTag("04a23b9c")).toBe(true);
    expect(isValidBallTag("BALL-12")).toBe(true);
  });

  it("rejects empty and punctuation-only input", () => {
    expect(isValidBallTag("")).toBe(false);
    expect(isValidBallTag("#")).toBe(false);
    expect(isValidBallTag("-12")).toBe(false); // must start alphanumeric
    expect(isValidBallTag("A2!")).toBe(false);
  });
});

describe("formatBallTag", () => {
  it("shows a tag the way it's written on the ball", () => {
    expect(formatBallTag("a2")).toBe("#A2");
  });
});

describe("rosterProgress", () => {
  it("counts the player being registered, not the ones already done", () => {
    expect(rosterProgress(0, 4)).toEqual({ position: 1, total: 4, complete: false });
    expect(rosterProgress(2, 4)).toEqual({ position: 3, total: 4, complete: false });
  });

  it("is complete once everyone present is registered", () => {
    expect(rosterProgress(4, 4)).toEqual({ position: 4, total: 4, complete: true });
  });

  it("stays complete if an extra player was added by hand", () => {
    // Staff can add someone the confirmed count didn't expect; that's a
    // warning on Screen 4, never a stuck progress indicator here.
    expect(rosterProgress(5, 4).complete).toBe(true);
  });
});

describe("isValidPresentHeadcount", () => {
  it("holds the group to the same 1-5 the booking flow sells", () => {
    expect(isValidPresentHeadcount(1)).toBe(true);
    expect(isValidPresentHeadcount(5)).toBe(true);
    expect(isValidPresentHeadcount(0)).toBe(false);
    expect(isValidPresentHeadcount(6)).toBe(false);
    expect(isValidPresentHeadcount(2.5)).toBe(false);
  });
});

describe("player names", () => {
  it("collapses the whitespace a tablet keyboard leaves behind", () => {
    expect(normalizePlayerName("  Alex   Chan ")).toBe("Alex Chan");
  });

  it("requires something to put on the leaderboard", () => {
    expect(isValidPlayerName("Alex")).toBe(true);
    expect(isValidPlayerName("   ")).toBe(false);
    expect(isValidPlayerName("x".repeat(61))).toBe(false);
  });
});

describe("pickWalkInWave", () => {
  const waves = [
    { id: "w15", date: "2026-10-05", startTime: "15:00:00" },
    { id: "w16", date: "2026-10-05", startTime: "16:00:00" },
    { id: "w17", date: "2026-10-05", startTime: "17:00:00" },
  ];

  it("uses the slot that's running now", () => {
    const now = new Date("2026-10-05T08:05:00.000Z"); // 16:05 HKT
    expect(pickWalkInWave(waves, now)?.id).toBe("w16");
  });

  it("uses the one about to start when someone arrives early", () => {
    const now = new Date("2026-10-05T07:50:00.000Z"); // 15:50 HKT, 10 min before 16:00
    expect(pickWalkInWave(waves, now)?.id).toBe("w16");
  });

  it("moves on to the next slot once the grace period has passed", () => {
    const now = new Date("2026-10-05T08:20:00.000Z"); // 16:20 HKT — 16:00 is gone
    expect(pickWalkInWave(waves, now)?.id).toBe("w17");
  });

  it("has nothing to offer after the last slot of the day", () => {
    const now = new Date("2026-10-05T10:00:00.000Z"); // 18:00 HKT
    expect(pickWalkInWave(waves, now)).toBeNull();
  });
});

describe("matchesSearch", () => {
  it("finds a booking by any part of the lead name, case-insensitively", () => {
    expect(matchesSearch("Alex Chan", "chan")).toBe(true);
    expect(matchesSearch("Alex Chan", "ALEX")).toBe(true);
    expect(matchesSearch("Alex Chan", "wong")).toBe(false);
  });

  it("shows the whole list when nothing is typed", () => {
    expect(matchesSearch("Alex Chan", "  ")).toBe(true);
  });
});
