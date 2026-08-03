// sessionCapacity.test.ts
import { describe, it, expect } from "vitest";
import { isSessionJoinable, shouldSessionBecomeFull } from "./sessionCapacity";

describe("isSessionJoinable", () => {
  it("allows joining an open session with room and wave capacity", () => {
    expect(isSessionJoinable({ status: "open", paidCount: 1, maxPlayers: 5, waveIsFull: false })).toBe(true);
  });

  it("blocks joining once the session is marked full", () => {
    expect(isSessionJoinable({ status: "full", paidCount: 5, maxPlayers: 5, waveIsFull: false })).toBe(false);
  });

  it("blocks joining once paid participants reach max_players", () => {
    expect(isSessionJoinable({ status: "open", paidCount: 5, maxPlayers: 5, waveIsFull: false })).toBe(false);
  });

  it("blocks joining once the wave itself is full, even if the session has room", () => {
    expect(isSessionJoinable({ status: "open", paidCount: 1, maxPlayers: 5, waveIsFull: true })).toBe(false);
  });

  it("allows joining a session with a single paid participant (no minimum)", () => {
    expect(isSessionJoinable({ status: "open", paidCount: 1, maxPlayers: 5, waveIsFull: false })).toBe(true);
  });
});

describe("shouldSessionBecomeFull", () => {
  it("is false while under max_players and the wave has room", () => {
    expect(shouldSessionBecomeFull({ paidCount: 2, maxPlayers: 5, waveIsFull: false })).toBe(false);
  });

  it("is true once paid participants hit max_players", () => {
    expect(shouldSessionBecomeFull({ paidCount: 5, maxPlayers: 5, waveIsFull: false })).toBe(true);
  });

  it("is true once the wave fills, even under max_players", () => {
    expect(shouldSessionBecomeFull({ paidCount: 2, maxPlayers: 5, waveIsFull: true })).toBe(true);
  });
});
