// ballFeedback.test.ts
import { describe, it, expect } from "vitest";
import type { BallDetection } from "./scoringRepo";
import {
  detectionKey,
  flattenDetections,
  cuesFromDetections,
  cueKindFromGameState,
  stationFinishesRound,
  stationsOutstanding,
  cueCopy,
  arrivalCopy,
  BANNER_DISMISS_MS,
  CUE_GLOW_MS,
  ARRIVAL_HOLD_MS,
} from "./ballFeedback";

const ROSTER = [
  { id: "p1", name: "Mika", ballTagId: "EPC-AAA" },
  { id: "p2", name: "Ravi", ballTagId: "EPC-BBB" },
  { id: "p3", name: "Jo", ballTagId: null }, // checked in without a ball
];

function detection(over: Partial<BallDetection> = {}): BallDetection {
  return {
    epc: "EPC-AAA",
    stationNumber: 3,
    role: "start",
    detectedAt: "2026-10-10T09:00:00.000Z",
    ...over,
  };
}

describe("detectionKey", () => {
  it("separates the two gates of one visit to a station", () => {
    const start = detection({ role: "start", detectedAt: "2026-10-10T09:00:00.000Z" });
    const end = detection({ role: "end", detectedAt: "2026-10-10T09:04:00.000Z" });
    expect(detectionKey(start)).not.toBe(detectionKey(end));
  });

  it("is stable for the same row, so a cue never fires twice", () => {
    expect(detectionKey(detection())).toBe(detectionKey(detection()));
  });
});

describe("flattenDetections", () => {
  it("interleaves every ball's rows into one oldest-first timeline", () => {
    const rows = flattenDetections({
      "EPC-AAA": [detection({ detectedAt: "2026-10-10T09:05:00.000Z" })],
      "EPC-BBB": [
        detection({ epc: "EPC-BBB", detectedAt: "2026-10-10T09:01:00.000Z" }),
        detection({ epc: "EPC-BBB", detectedAt: "2026-10-10T09:09:00.000Z" }),
      ],
    });
    expect(rows.map((r) => r.detectedAt)).toEqual([
      "2026-10-10T09:01:00.000Z",
      "2026-10-10T09:05:00.000Z",
      "2026-10-10T09:09:00.000Z",
    ]);
  });
});

describe("cuesFromDetections", () => {
  it("names the player whose ball it is", () => {
    const [cue] = cuesFromDetections([detection()], new Set(), ROSTER, { roundFinishes: false });
    expect(cue.playerName).toBe("Mika");
    expect(cue.playerId).toBe("p1");
    expect(cue.kind).toBe("arrival");
  });

  it("still cues an unbound ball, but without a name to prompt", () => {
    // A ball nobody checked out crossing the antenna is worth confirming as
    // "the hardware is reading" — it must not become a save-your-score
    // prompt aimed at a player who doesn't exist.
    const [cue] = cuesFromDetections([detection({ epc: "EPC-STRANGER" })], new Set(), ROSTER, {
      roundFinishes: false,
    });
    expect(cue.playerId).toBeNull();
    expect(cue.playerName).toBeNull();
  });

  it("reads the end gate as finishing the station", () => {
    const [cue] = cuesFromDetections([detection({ role: "end" })], new Set(), ROSTER, { roundFinishes: false });
    expect(cue.kind).toBe("station-finish");
  });

  it("reads the end gate as finishing the round when nothing else is left", () => {
    const [cue] = cuesFromDetections([detection({ role: "end" })], new Set(), ROSTER, { roundFinishes: true });
    expect(cue.kind).toBe("round-finish");
  });

  it("ignores rows already seen — the history on screen when a station opens", () => {
    const history = detection();
    const cues = cuesFromDetections([history], new Set([detectionKey(history)]), ROSTER, {
      roundFinishes: false,
    });
    expect(cues).toEqual([]);
  });
});

describe("cueKindFromGameState", () => {
  it("maps the field the backend is adding onto the same cues", () => {
    expect(cueKindFromGameState("playing_station_4", false)).toBe("arrival");
    expect(cueKindFromGameState("completed", false)).toBe("station-finish");
    expect(cueKindFromGameState("completed", true)).toBe("round-finish");
  });

  it("ignores a state it doesn't recognise rather than guessing", () => {
    expect(cueKindFromGameState("idle", false)).toBeNull();
  });
});

describe("stationFinishesRound", () => {
  const full = (stations: number[]) =>
    Object.fromEntries(
      ROSTER.map((p) => [p.id, Object.fromEntries(stations.map((s) => [s, 3]))])
    ) as Record<string, Record<number, number>>;

  it("is false while other stations are unplayed", () => {
    expect(stationFinishesRound(full([1, 2]), ROSTER, 3)).toBe(false);
  });

  it("is true at whatever station they reach last, in any order", () => {
    // Played 1, 3, 4, 5 — so 2 is the last one, despite not being station 5.
    expect(stationFinishesRound(full([1, 3, 4, 5]), ROSTER, 2)).toBe(true);
  });

  it("is not fooled by one player being ahead of the group", () => {
    const scores = full([1, 2, 3, 4]);
    delete scores["p2"][4]; // Ravi hasn't logged station 4 yet
    expect(stationFinishesRound(scores, ROSTER, 5)).toBe(false);
  });

  it("is false with nobody on the roster", () => {
    expect(stationFinishesRound({}, [], 5)).toBe(false);
  });
});

describe("stationsOutstanding", () => {
  it("lists what the group still owes, whatever order they took", () => {
    const scores = { p1: { 2: 3 }, p2: { 2: 4 }, p3: { 2: 2 } };
    expect(stationsOutstanding(scores, ROSTER)).toEqual([1, 3, 4, 5]);
  });
});

describe("copy", () => {
  it("asks about the station by number, and never claims to know the strokes", () => {
    const copy = cueCopy("station-finish", 3, "Mika");
    expect(copy.title).toBe("Finished Station 3, Mika?");
    expect(copy.action).toBe("Save your score");
  });

  it("marks the end of the round as an ending, not another station", () => {
    expect(cueCopy("round-finish", 2, "Mika")).toEqual({
      title: "Finished your round, Mika?",
      action: "Save your final score",
    });
  });

  it("drops the name when the ball isn't linked to anyone", () => {
    expect(cueCopy("station-finish", 3, null).title).toBe("Finished Station 3?");
    expect(arrivalCopy(3, null)).toBe("Ball detected at Station 3");
  });
});

describe("timings", () => {
  it("all sit well inside the relay's 60s presence dedupe", () => {
    // Otherwise a banner could still be counting down when the same ball
    // re-fires, and the two timers would fight each other on screen.
    for (const ms of [CUE_GLOW_MS, BANNER_DISMISS_MS, ARRIVAL_HOLD_MS]) {
      expect(ms).toBeLessThan(60_000);
    }
  });
});

describe("cueCopy for a station already logged", () => {
  it("offers a correction instead of pretending the score is new", () => {
    // A ball crossing an end gate it has crossed before is common — someone
    // re-rolling, or walking back past the antenna.
    expect(cueCopy("station-finish", 1, "Mika", true)).toEqual({
      title: "Change Mika's score?",
      action: "Station 1 is already logged",
    });
  });

  it("says the same for a round-finish read, since the score is still in", () => {
    expect(cueCopy("round-finish", 3, "Mika", true).title).toBe("Change Mika's score?");
  });
});
