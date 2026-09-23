// FILE: lib/scoring/ballFeedback.ts
// -----------------------------------------------------------------------------
// The rules behind the kiosk's RFID visual feedback: which detection becomes
// which cue, what each cue says, and how long it stays. No Supabase and no
// React here on purpose (same reasoning as activeWindow.ts), so the triggers
// are testable without a database or a browser — see ballFeedback.test.ts.
//
// Nothing in this file writes anything or gates anything technically. Strokes
// stay manual and authoritative throughout: a cue prompts and animates, and
// that is all it ever does. The hardware can't count strokes (unconfirmed),
// so no copy or state here may imply that it does.
//
// FORWARD COMPATIBILITY. The backend plan is a `game_state` field derived
// from ball_detections (start antenna -> playing_station_X, end antenna ->
// completed). It doesn't exist yet, so cues are derived from the raw rows'
// `role` + `station_number`. cueKindFromGameState() below is the same
// mapping expressed against that future field: when it lands, swap the
// caller and every animation keeps working untouched.
// -----------------------------------------------------------------------------

import type { BallDetection } from "./scoringRepo";
import { STATION_NUMBERS } from "./stations";

// -----------------------------------------------------------------------------
// Timings
// -----------------------------------------------------------------------------
// The relay dedupes a stationary ball with a 60s presence timeout, so the
// soonest a given (epc, antenna) can re-fire is a minute apart. Every timing
// below is far inside that, which is what keeps a banner's own timer from
// fighting the next detection. These are the numbers to tune on site with
// real hardware — they're deliberately in one place.

/** How long a lightweight detection glow/pulse stays lit (Feature 3). */
export const CUE_GLOW_MS = 2600;
/** How long the "save your score" banner waits before auto-dismissing
 *  (Features 1 and 2) if nobody touches it. */
export const BANNER_DISMISS_MS = 8000;
/** How long the arrival identity card holds the screen before stroke entry
 *  is released (Feature 4). Short: it's an orientation beat, not a gate
 *  worth waiting out. */
export const ARRIVAL_HOLD_MS = 2200;

// -----------------------------------------------------------------------------
// Cues
// -----------------------------------------------------------------------------

/**
 * The two game states the brief calls for — beginning and end — plus the
 * end-of-round case the final station has to read as something more than
 * "another station done".
 *
 *   arrival        the start gate saw the ball: this player is on this
 *                  station now (game_state `playing_station_X`)
 *   station-finish the end gate saw it, and stations remain
 *   round-finish   the end gate saw it, and this was their last station
 *                  (game_state `completed`)
 */
export type CueKind = "arrival" | "station-finish" | "round-finish";

export interface DetectionCue {
  /** Stable identity for a single physical arrival, so a cue is never fired
   *  twice for the same row and React can key on it. */
  id: string;
  kind: CueKind;
  epc: string;
  stationNumber: number;
  detectedAt: string;
  /** Null when the ball isn't linked to anyone on this roster — an unbound
   *  ball still deserves the lightweight "hardware works" cue, but it can't
   *  be named and must never prompt a score. */
  playerId: string | null;
  playerName: string | null;
}

export function detectionKey(detection: Pick<BallDetection, "epc" | "role" | "detectedAt">): string {
  return `${detection.epc}|${detection.role}|${detection.detectedAt}`;
}

/** Every detection in the feed as one list, oldest first. */
export function flattenDetections(rowsByEpc: Record<string, BallDetection[]>): BallDetection[] {
  return Object.values(rowsByEpc)
    .flat()
    .sort((a, b) => a.detectedAt.localeCompare(b.detectedAt));
}

export interface RosterEntry {
  id: string;
  name: string;
  ballTagId: string | null;
}

/**
 * Turns the rows a poll has never seen before into cues.
 *
 * The first poll of a station is the player's history there, not a set of
 * arrivals — pass its keys as `seen` so nothing from before the kiosk was
 * looking fires a banner at someone.
 */
export function cuesFromDetections(
  detections: BallDetection[],
  seen: ReadonlySet<string>,
  roster: RosterEntry[],
  options: { roundFinishes: boolean }
): DetectionCue[] {
  const byTag = new Map(roster.filter((p) => p.ballTagId).map((p) => [p.ballTagId as string, p]));

  return detections
    .filter((d) => !seen.has(detectionKey(d)))
    .map((d) => {
      const player = byTag.get(d.epc) ?? null;
      return {
        id: detectionKey(d),
        kind: cueKindForRole(d.role, options.roundFinishes),
        epc: d.epc,
        stationNumber: d.stationNumber,
        detectedAt: d.detectedAt,
        playerId: player?.id ?? null,
        playerName: player?.name ?? null,
      };
    });
}

function cueKindForRole(role: BallDetection["role"], roundFinishes: boolean): CueKind {
  if (role === "start") return "arrival";
  return roundFinishes ? "round-finish" : "station-finish";
}

/**
 * The same mapping, driven by the team's `game_state` instead of a raw
 * antenna role. Unused until that field ships — it's here so wiring it up is
 * a one-line change at the call site rather than a rewrite of the cue layer.
 */
export function cueKindFromGameState(state: string, roundFinishes: boolean): CueKind | null {
  if (state === "completed") return roundFinishes ? "round-finish" : "station-finish";
  if (/^playing_station_\d+$/.test(state)) return "arrival";
  return null;
}

// -----------------------------------------------------------------------------
// "Is this their last station?"
// -----------------------------------------------------------------------------

/**
 * Whether finishing `station` completes the round for this group.
 *
 * Deliberately not "station === 5". The station order is non-strict — groups
 * play them in whatever order the floor allows — so the last station is
 * whichever one they happen to reach with every other station already
 * logged. A group that starts at 4 and ends at 2 gets the round-complete
 * treatment at 2, which a fixed station number would miss entirely.
 */
export function stationFinishesRound(
  scoresByPlayer: Record<string, Record<number, number>>,
  roster: RosterEntry[],
  station: number
): boolean {
  if (roster.length === 0) return false;

  return STATION_NUMBERS.filter((n) => n !== station).every((other) =>
    roster.every((player) => scoresByPlayer[player.id]?.[other] !== undefined)
  );
}

/** Which stations this group still has nobody's score for — drives the
 *  station strip's "still to play" marks, and reads the same whatever order
 *  they're playing in. */
export function stationsOutstanding(
  scoresByPlayer: Record<string, Record<number, number>>,
  roster: RosterEntry[]
): number[] {
  return STATION_NUMBERS.filter((n) =>
    roster.some((player) => scoresByPlayer[player.id]?.[n] === undefined)
  );
}

// -----------------------------------------------------------------------------
// Copy
// -----------------------------------------------------------------------------
// One template with the station number swapped in, which is the open question
// the brief flags. Per-station wording is supported without touching any
// component: add the station's number to STATION_COPY and it wins. Left empty
// until the team confirms the station names/branding.

const STATION_COPY: Record<number, { title: string; action: string }> = {};

export interface CueCopy {
  /** The question. Phrased as a prompt, never as a claim about strokes. */
  title: string;
  /** What the highlighted button does. */
  action: string;
}

export function cueCopy(
  kind: CueKind,
  stationNumber: number,
  playerName: string | null,
  // A ball can cross an end gate at a station whose score is already in —
  // someone re-rolling a hole, or just walking back past the antenna. The
  // prompt is still worth showing (they may want to correct it), but asking
  // them to "save your score" for a number they've already saved is a lie
  // the floor will notice.
  alreadyLogged = false
): CueCopy {
  if (alreadyLogged) {
    return {
      title: playerName ? `Change ${playerName}'s score?` : "Change that score?",
      action: `Station ${stationNumber} is already logged`,
    };
  }

  if (kind === "round-finish") {
    return {
      title: playerName ? `Finished your round, ${playerName}?` : "Finished your round?",
      action: "Save your final score",
    };
  }

  const override = STATION_COPY[stationNumber];
  if (override) return override;

  return {
    title: playerName
      ? `Finished Station ${stationNumber}, ${playerName}?`
      : `Finished Station ${stationNumber}?`,
    action: "Save your score",
  };
}

/** The line the arrival card shows under the group name (Feature 4). */
export function arrivalCopy(stationNumber: number, playerName: string | null): string {
  return playerName ? `${playerName} is up at Station ${stationNumber}` : `Ball detected at Station ${stationNumber}`;
}
