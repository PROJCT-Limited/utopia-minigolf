// FILE: lib/scoring/kioskScenes.ts
// -----------------------------------------------------------------------------
// The kiosk is a show, not a page.
//
// A player walks up having just rolled a ball. They are holding a putter,
// standing among four other people, reading from two metres away. So the
// screen plays scenes — one thing at a time, full bleed, held long enough to
// read out loud — and the only interactive moment in the whole loop is the
// one that has to be: typing the stroke count, which no antenna can know.
//
// The loop, per player, per station:
//
//   start gate  -> ARRIVAL    "MIKA — YOU'RE UP"        (who the floor saw)
//               -> STANDINGS  their row against the group
//   end gate    -> CHEER      "BALL'S IN!"              (+ what happens next)
//               -> STROKES    the one screen they touch
//   saved       -> STANDINGS  their new total against the group
//
// This file holds the scene shapes, how long each one stays, and every word
// any of them says. No React and no database, so the whole sequence is
// testable — see kioskScenes.test.ts.
// -----------------------------------------------------------------------------

import type { BallDetection } from "./scoringRepo";
import { STATION_NUMBERS } from "./stations";

// -----------------------------------------------------------------------------
// Gate reads
// -----------------------------------------------------------------------------

export interface RosterEntry {
  id: string;
  name: string;
  /** The EPC linked to this player at check-in, or null if they haven't got
   *  a ball on their card. */
  ballTagId: string | null;
}

/** One physical arrival, identified so it is never announced twice. */
export function detectionKey(detection: Pick<BallDetection, "epc" | "role" | "detectedAt">): string {
  return `${detection.epc}|${detection.role}|${detection.detectedAt}`;
}

/**
 * The same start/end split, expressed against the `game_state` field the
 * backend is adding (start antenna -> playing_station_X, end antenna ->
 * completed). Unused until that lands — it's here so switching over is one
 * line at the call site rather than a rewrite of the scene layer.
 */
export function gateFromGameState(state: string): "start" | "end" | null {
  if (state === "completed") return "end";
  if (/^playing_station_\d+$/.test(state)) return "start";
  return null;
}

// -----------------------------------------------------------------------------
// How long a scene holds
// -----------------------------------------------------------------------------
// Read-aloud time, not animation time. The rule of thumb used here: a scene
// must survive being read by someone who only looks up halfway through it, so
// nothing is shorter than three seconds, and the standings — which people
// actually want to study — gets five.

export const SCENE_MS = {
  arrival: 4000,
  cheer: 3600,
  standings: 5200,
} as const;

/** How long the entrance animation of a scene runs. Kept well under the
 *  scene's own hold so the thing is still and readable for most of its life. */
export const SCENE_IN_MS = 520;

// -----------------------------------------------------------------------------
// Scenes
// -----------------------------------------------------------------------------

export type SceneKind = "arrival" | "cheer" | "standings";

export interface Scene {
  /** Fresh per queued scene, so re-queueing the same beat restarts it. */
  id: string;
  kind: SceneKind;
  stationNumber: number;
  /** The player this scene is about, if it's about one. */
  playerId: string | null;
  headline: string;
  /** The line under the headline. */
  support: string;
  /** Small mono line above it — station, group, context. */
  eyebrow: string;
  /** Where the loop goes when this scene's time is up. */
  then: "rest" | "strokes";
  /** "big" is reserved for the end of a whole round — the one moment in the
   *  loop that isn't going to happen again for this group. */
  tone: "normal" | "big";
}

let sceneSeq = 0;
function sceneId(kind: SceneKind): string {
  return `${kind}-${++sceneSeq}`;
}

// -----------------------------------------------------------------------------
// Copy
// -----------------------------------------------------------------------------
// Cheerful, short, and never a claim the hardware can't back. The antennas
// know a ball went past; they do not know whether it went in, how many shots
// it took, or whether anyone is winning. Every line below is true of a ball
// crossing a gate.

export function arrivalScene({
  stationNumber,
  playerId,
  playerName,
  groupName,
}: {
  stationNumber: number;
  playerId: string | null;
  playerName: string | null;
  groupName: string;
}): Scene {
  if (!playerName) {
    return {
      id: sceneId("arrival"),
      kind: "arrival",
      stationNumber,
      playerId: null,
      eyebrow: `Station ${stationNumber}`,
      headline: "New ball",
      support: "This one isn't checked in — see the desk to get on the scoreboard.",
      then: "rest",
      tone: "normal",
    };
  }

  return {
    id: sceneId("arrival"),
    kind: "arrival",
    stationNumber,
    playerId,
    eyebrow: `${groupName} · Station ${stationNumber}`,
    headline: playerName,
    support: "You're up.",
    then: "rest",
    tone: "normal",
  };
}

export interface CheerContext {
  /** Nothing else left for this group once this station is logged. */
  roundFinishes: boolean;
  /** Everyone else in the group has already logged this station. */
  lastThrough: boolean;
  /** Nobody in the group has logged this station yet. */
  firstThrough: boolean;
  /** This player's score for this station is already in. */
  alreadyLogged: boolean;
}

/**
 * The end-gate moment, with a few different things to say depending on what
 * the screen actually knows. Deterministic, not random: the same situation
 * always gets the same line, so nothing ever reads as a slot machine, and
 * "last one through" is only ever said to someone who really is.
 */
export function cheerScene({
  stationNumber,
  playerId,
  playerName,
  context,
}: {
  stationNumber: number;
  playerId: string | null;
  playerName: string | null;
  context: CheerContext;
}): Scene {
  const base = {
    id: sceneId("cheer"),
    kind: "cheer" as const,
    stationNumber,
    playerId,
    eyebrow: playerName ? `${playerName} · Station ${stationNumber}` : `Station ${stationNumber}`,
  };

  if (!playerName) {
    return {
      ...base,
      playerId: null,
      headline: "Ball's in",
      support: "Not checked in, so there's no card to score it on.",
      then: "rest",
      tone: "normal",
    };
  }
  if (context.alreadyLogged) {
    return {
      ...base,
      headline: "Round two",
      support: `Station ${stationNumber} is already on your card — change it if you want.`,
      then: "strokes",
      tone: "normal",
    };
  }
  if (context.roundFinishes) {
    return {
      ...base,
      headline: "That's your round!",
      support: "One last count and the card is yours.",
      then: "strokes",
      tone: "big",
    };
  }
  if (context.lastThrough) {
    return {
      ...base,
      headline: "Last one through!",
      support: "The group's waiting — let's count those strokes.",
      then: "strokes",
      tone: "normal",
    };
  }
  if (context.firstThrough) {
    return {
      ...base,
      headline: "First through!",
      support: "Now let's count your strokes.",
      then: "strokes",
      tone: "normal",
    };
  }
  return {
    ...base,
    headline: "Ball's in!",
    support: "Now let's count your strokes.",
    then: "strokes",
    tone: "normal",
  };
}

/**
 * What the screen knows about this end-gate read, which is what decides
 * which line it gets. Computed from the group's card, never from a clock or
 * a coin toss, so "last one through" is only said to someone genuinely
 * holding the group up.
 */
export function cheerContext(
  roster: { id: string }[],
  scoresByPlayer: Record<string, Record<number, number>>,
  playerId: string | null,
  stationNumber: number
): CheerContext {
  const logged = (id: string) => scoresByPlayer[id]?.[stationNumber] !== undefined;
  const others = roster.filter((p) => p.id !== playerId);

  return {
    // Their round, not the group's: this line is addressed to one person
    // standing at a gate, and it's true when they personally have every
    // other station on their card — whatever order they took them in, and
    // whoever else is still out there playing.
    roundFinishes:
      playerId !== null &&
      STATION_NUMBERS.filter((n) => n !== stationNumber).every(
        (other) => scoresByPlayer[playerId]?.[other] !== undefined
      ),
    lastThrough: others.length > 0 && others.every((p) => logged(p.id)),
    firstThrough: roster.every((p) => !logged(p.id)),
    alreadyLogged: playerId !== null && logged(playerId),
  };
}

/** 1st, 2nd, 3rd, 4th — for telling someone where they stand in words
 *  rather than making them work it out from a column. */
export function ordinal(place: number): string {
  const rest = place % 100;
  if (rest >= 11 && rest <= 13) return `${place}th`;
  const suffix = ["th", "st", "nd", "rd"][place % 10] ?? "th";
  return `${place}${place % 10 <= 3 ? suffix : "th"}`;
}

export function standingsScene({
  stationNumber,
  playerId,
  playerName,
  groupName,
  justLogged,
  place,
  fieldSize,
}: {
  stationNumber: number;
  playerId: string | null;
  playerName: string | null;
  groupName: string;
  /** Strokes just saved, when this scene follows a score going in. */
  justLogged?: number;
  /** Where this player sits in the group, if they're on the card at all. */
  place?: number | null;
  /** How many players have a position — "2nd of 3" needs both halves. */
  fieldSize?: number;
}): Scene {
  const scored = justLogged !== undefined && playerName;
  // The headline earns its size by saying something the table doesn't say at
  // a glance: what you just scored, or where that leaves you. Repeating the
  // group name — which the eyebrow already carries — would waste the biggest
  // words on the screen.
  const headline = scored
    ? `${playerName}, ${justLogged} ${justLogged === 1 ? "stroke" : "strokes"}`
    : playerName && place
      ? `${playerName} · ${ordinal(place)}${fieldSize ? ` of ${fieldSize}` : ""}`
      : groupName;

  return {
    id: sceneId("standings"),
    kind: "standings",
    stationNumber,
    playerId,
    eyebrow: `${groupName} · Station ${stationNumber}`,
    headline,
    support: scored ? "On the card." : "How the group stands.",
    then: "rest",
    tone: "normal",
  };
}

// -----------------------------------------------------------------------------
// Standings
// -----------------------------------------------------------------------------

export interface StandingRow {
  playerId: string;
  name: string;
  /** Strokes across every station logged so far. */
  total: number;
  stationsPlayed: number;
  /** This station's strokes, or null if it isn't logged yet. */
  atStation: number | null;
  /** 1-based, ties share a place. Null until they've logged anything — an
   *  empty card has no position in the group. */
  place: number | null;
}

/**
 * The group's card. Fewest strokes first, which is the only direction golf
 * counts in; anyone who hasn't logged a station yet sits at the bottom
 * without a place, because ranking an empty card above a played one would
 * reward not playing.
 */
export function standings(
  roster: { id: string; name: string }[],
  scoresByPlayer: Record<string, Record<number, number>>,
  stationNumber: number
): StandingRow[] {
  const rows = roster.map((player) => {
    const scores = scoresByPlayer[player.id] ?? {};
    const played = STATION_NUMBERS.filter((n) => scores[n] !== undefined);
    return {
      playerId: player.id,
      name: player.name,
      total: played.reduce((sum, n) => sum + scores[n], 0),
      stationsPlayed: played.length,
      atStation: scores[stationNumber] ?? null,
      place: null as number | null,
    };
  });

  const ranked = rows.filter((r) => r.stationsPlayed > 0).sort((a, b) => a.total - b.total);
  let place = 0;
  let lastTotal: number | null = null;
  ranked.forEach((row, i) => {
    if (row.total !== lastTotal) {
      place = i + 1;
      lastTotal = row.total;
    }
    row.place = place;
  });

  return [...ranked, ...rows.filter((r) => r.stationsPlayed === 0)];
}

/** Stations nobody in the group has logged yet — the progress line on the
 *  standings scene, which is where "what's left" belongs rather than as a
 *  permanent strip across the top of everything. */
export function stationsLeft(
  roster: { id: string }[],
  scoresByPlayer: Record<string, Record<number, number>>
): number[] {
  return STATION_NUMBERS.filter((n) =>
    roster.some((player) => scoresByPlayer[player.id]?.[n] === undefined)
  );
}
