// kioskScenes.test.ts
import { describe, it, expect } from "vitest";
import {
  arrivalScene,
  cheerScene,
  cheerContext,
  standingsScene,
  standings,
  stationsLeft,
  ordinal,
  SCENE_MS,
  SCENE_IN_MS,
  detectionKey,
  gateFromGameState,
} from "./kioskScenes";

const ROSTER = [
  { id: "p1", name: "Mika" },
  { id: "p2", name: "Ravi" },
  { id: "p3", name: "Jo" },
];

const CONTEXT = { roundFinishes: false, lastThrough: false, firstThrough: false, alreadyLogged: false };

describe("arrivalScene", () => {
  it("leads with the player, since that's what the group is checking", () => {
    const scene = arrivalScene({ stationNumber: 3, playerId: "p1", playerName: "Mika", groupName: "Mika's group" });
    expect(scene.headline).toBe("Mika");
    expect(scene.eyebrow).toBe("Mika's group · Station 3");
    expect(scene.then).toBe("rest");
  });

  it("sends an unchecked-in ball to the desk instead of naming nobody", () => {
    const scene = arrivalScene({ stationNumber: 3, playerId: null, playerName: null, groupName: "Mika's group" });
    expect(scene.headline).toBe("New ball");
    expect(scene.support).toContain("desk");
    expect(scene.playerId).toBeNull();
  });
});

describe("cheerScene", () => {
  it("takes them to the stroke count, which is the only thing it can't know", () => {
    const scene = cheerScene({ stationNumber: 2, playerId: "p1", playerName: "Mika", context: CONTEXT });
    expect(scene.headline).toBe("Ball's in!");
    expect(scene.support).toBe("Now let's count your strokes.");
    expect(scene.then).toBe("strokes");
  });

  it("marks the end of a round as an ending", () => {
    const scene = cheerScene({
      stationNumber: 2,
      playerId: "p1",
      playerName: "Mika",
      context: { ...CONTEXT, roundFinishes: true },
    });
    expect(scene.headline).toBe("That's your round!");
  });

  it("only hurries someone who is genuinely holding the group up", () => {
    const hurried = cheerScene({
      stationNumber: 2,
      playerId: "p1",
      playerName: "Mika",
      context: { ...CONTEXT, lastThrough: true },
    });
    expect(hurried.headline).toBe("Last one through!");
    // …and never says it to the first ball through the gate.
    const first = cheerScene({
      stationNumber: 2,
      playerId: "p1",
      playerName: "Mika",
      context: { ...CONTEXT, firstThrough: true },
    });
    expect(first.headline).toBe("First through!");
  });

  it("is the same line every time for the same situation, never a lottery", () => {
    const a = cheerScene({ stationNumber: 2, playerId: "p1", playerName: "Mika", context: CONTEXT });
    const b = cheerScene({ stationNumber: 2, playerId: "p1", playerName: "Mika", context: CONTEXT });
    expect(a.headline).toBe(b.headline);
    expect(a.id).not.toBe(b.id); // but each queued scene is its own instance
  });

  it("offers a correction rather than a fresh count when the score is in", () => {
    const scene = cheerScene({
      stationNumber: 1,
      playerId: "p1",
      playerName: "Mika",
      context: { ...CONTEXT, alreadyLogged: true },
    });
    expect(scene.headline).toBe("Round two");
    expect(scene.then).toBe("strokes");
  });

  it("has nowhere to send a ball with no card", () => {
    const scene = cheerScene({ stationNumber: 1, playerId: null, playerName: null, context: CONTEXT });
    expect(scene.then).toBe("rest");
  });
});

describe("standingsScene", () => {
  it("announces the score that just went in", () => {
    const scene = standingsScene({
      stationNumber: 3,
      playerId: "p1",
      playerName: "Mika",
      groupName: "Mika's group",
      justLogged: 4,
    });
    expect(scene.headline).toBe("Mika, 4 strokes");
    expect(scene.support).toBe("On the card.");
  });

  it("says one stroke, not 1 strokes", () => {
    const scene = standingsScene({
      stationNumber: 3,
      playerId: "p1",
      playerName: "Mika",
      groupName: "G",
      justLogged: 1,
    });
    expect(scene.headline).toBe("Mika, 1 stroke");
  });
});

describe("standings", () => {
  const scores = {
    p1: { 1: 3, 2: 4 }, // 7
    p2: { 1: 2, 2: 3 }, // 5
    p3: {}, // hasn't played
  };

  it("puts the fewest strokes first", () => {
    const rows = standings(ROSTER, scores, 2);
    expect(rows.map((r) => r.name)).toEqual(["Ravi", "Mika", "Jo"]);
    expect(rows[0].place).toBe(1);
    expect(rows[1].place).toBe(2);
  });

  it("gives an empty card no place rather than first place", () => {
    const rows = standings(ROSTER, scores, 2);
    expect(rows[2]).toMatchObject({ name: "Jo", place: null, stationsPlayed: 0, total: 0 });
  });

  it("shares a place on a tie", () => {
    const rows = standings(ROSTER, { p1: { 1: 3 }, p2: { 1: 3 }, p3: { 1: 5 } }, 1);
    expect(rows.map((r) => r.place)).toEqual([1, 1, 3]);
  });

  it("carries this station's own number beside the total", () => {
    const rows = standings(ROSTER, scores, 2);
    expect(rows.find((r) => r.name === "Mika")).toMatchObject({ atStation: 4, total: 7 });
    expect(rows.find((r) => r.name === "Jo")?.atStation).toBeNull();
  });
});

describe("stationsLeft", () => {
  it("counts a station done only once everyone has logged it", () => {
    const scores = { p1: { 1: 3 }, p2: { 1: 4 }, p3: {} };
    expect(stationsLeft(ROSTER, scores)).toEqual([1, 2, 3, 4, 5]);
    const all = { p1: { 1: 3 }, p2: { 1: 4 }, p3: { 1: 2 } };
    expect(stationsLeft(ROSTER, all)).toEqual([2, 3, 4, 5]);
  });
});

describe("scene timings", () => {
  it("holds every scene long enough to be read from a couple of metres", () => {
    for (const ms of Object.values(SCENE_MS)) expect(ms).toBeGreaterThanOrEqual(3000);
  });

  it("finishes animating well before the scene's time is up", () => {
    for (const ms of Object.values(SCENE_MS)) expect(SCENE_IN_MS).toBeLessThan(ms / 3);
  });
});

describe("cheerContext", () => {
  const stations = (obj: Record<string, number[]>) =>
    Object.fromEntries(
      Object.entries(obj).map(([id, list]) => [id, Object.fromEntries(list.map((n) => [n, 3]))])
    ) as Record<string, Record<number, number>>;

  it("calls the first ball through a station first", () => {
    const ctx = cheerContext(ROSTER, stations({}), "p1", 2);
    expect(ctx.firstThrough).toBe(true);
    expect(ctx.lastThrough).toBe(false);
  });

  it("calls the last one last, and only when everyone else is in", () => {
    const nearlyDone = cheerContext(ROSTER, stations({ p2: [2], p3: [2] }), "p1", 2);
    expect(nearlyDone.lastThrough).toBe(true);
    const halfway = cheerContext(ROSTER, stations({ p2: [2] }), "p1", 2);
    expect(halfway.lastThrough).toBe(false);
  });

  it("never calls a solo player the last one through", () => {
    // With nobody else on the card there's no group to hold up.
    const solo = [{ id: "p1", name: "Mika" }];
    expect(cheerContext(solo, stations({}), "p1", 2).lastThrough).toBe(false);
  });

  it("ends a player's round when their own card is full, whatever order they took", () => {
    const mikaDone = stations({ p1: [1, 3, 4, 5] });
    expect(cheerContext(ROSTER, mikaDone, "p1", 2).roundFinishes).toBe(true);
    expect(cheerContext(ROSTER, mikaDone, "p1", 4).roundFinishes).toBe(false);
  });

  it("doesn't end someone's round because the rest of the group finished", () => {
    // The line is addressed to one person at a gate; the group's progress is
    // none of its business.
    const othersDone = stations({ p2: [1, 2, 3, 4, 5], p3: [1, 2, 3, 4, 5] });
    expect(cheerContext(ROSTER, othersDone, "p1", 2).roundFinishes).toBe(false);
  });

  it("has no round to end for a ball with no card", () => {
    expect(cheerContext(ROSTER, stations({}), null, 2).roundFinishes).toBe(false);
  });

  it("spots a score that's already in", () => {
    expect(cheerContext(ROSTER, stations({ p1: [2] }), "p1", 2).alreadyLogged).toBe(true);
  });
});

describe("scene tone", () => {
  it("saves the big frame for the end of a round", () => {
    const round = cheerScene({
      stationNumber: 2,
      playerId: "p1",
      playerName: "Mika",
      context: { ...CONTEXT, roundFinishes: true },
    });
    const ordinary = cheerScene({ stationNumber: 2, playerId: "p1", playerName: "Mika", context: CONTEXT });
    expect(round.tone).toBe("big");
    expect(ordinary.tone).toBe("normal");
  });
});

describe("ordinal", () => {
  it("handles the ones that aren't 'th'", () => {
    expect([1, 2, 3, 4].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th"]);
  });

  it("knows the teens are all 'th'", () => {
    expect([11, 12, 13].map(ordinal)).toEqual(["11th", "12th", "13th"]);
  });
});

describe("standingsScene headline", () => {
  it("tells a player where they stand rather than repeating the group name", () => {
    const scene = standingsScene({
      stationNumber: 3,
      playerId: "p1",
      playerName: "Mika",
      groupName: "Mika's group",
      place: 2,
      fieldSize: 3,
    });
    expect(scene.headline).toBe("Mika · 2nd of 3");
  });

  it("falls back to the group when the player has no position yet", () => {
    const scene = standingsScene({
      stationNumber: 3,
      playerId: "p1",
      playerName: "Mika",
      groupName: "Mika's group",
      place: null,
    });
    expect(scene.headline).toBe("Mika's group");
  });

  it("still leads with the score when one has just gone in", () => {
    const scene = standingsScene({
      stationNumber: 3,
      playerId: "p1",
      playerName: "Mika",
      groupName: "Mika's group",
      justLogged: 4,
      place: 2,
      fieldSize: 3,
    });
    expect(scene.headline).toBe("Mika, 4 strokes");
  });
});

describe("detectionKey", () => {
  it("separates the two gates of one visit", () => {
    const row = { epc: "E1", detectedAt: "2026-10-10T09:00:00.000Z" };
    expect(detectionKey({ ...row, role: "start" as const })).not.toBe(
      detectionKey({ ...row, role: "end" as const })
    );
  });

  it("is stable, so a read is never announced twice", () => {
    const row = { epc: "E1", role: "start" as const, detectedAt: "2026-10-10T09:00:00.000Z" };
    expect(detectionKey(row)).toBe(detectionKey({ ...row }));
  });
});

describe("gateFromGameState", () => {
  it("maps the field the backend is adding onto the same two gates", () => {
    expect(gateFromGameState("playing_station_4")).toBe("start");
    expect(gateFromGameState("completed")).toBe("end");
  });

  it("ignores a state it doesn't recognise rather than guessing", () => {
    expect(gateFromGameState("idle")).toBeNull();
  });
});
