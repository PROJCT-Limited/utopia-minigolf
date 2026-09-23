// FILE: app/kiosk/demoFeed.ts
// -----------------------------------------------------------------------------
// Synthetic detections, so the visual feedback can be built and reviewed
// before the hardware is reachable.
//
// Three of this work's dependencies are outstanding at the time of writing:
// the RFID reader and relay are on site and not on this network, the
// ball_detections table hasn't been created in the database yet
// (migrations/023_ball_detections.sql is unapplied), and Supabase test
// credentials were requested but not confirmed. Demo mode fills that gap
// without faking anything downstream: the rows it makes are ordinary
// BallDetection objects pushed through useDetectionFeed's own pipeline, so
// what you see is exactly what a real antenna will produce. Nothing is
// written to the database, and no score is ever entered on a player's
// behalf.
//
// Reached with /kiosk?demo=1, which also unlocks "Play the whole thing" —
// the full loop (arrival, card, cheer, stroke count, card again) for two
// players, at the speed a player lives it.
//
// It changes nothing when the flag is absent.
// -----------------------------------------------------------------------------

import type { BallDetection } from "@/lib/scoring/scoringRepo";
import type { RosterEntry } from "@/lib/scoring/kioskScenes";

export const DEMO_QUERY_FLAG = "demo";

/** A ball for a player who has one; otherwise a plausible stranger's tag, so
 *  the unbound-ball path can be demonstrated too. */
function tagFor(player: RosterEntry | undefined): string {
  return player?.ballTagId ?? "E280689400005011AF3C0000";
}

export function demoDetection({
  role,
  station,
  player,
}: {
  role: "start" | "end";
  station: number;
  player?: RosterEntry;
}): BallDetection {
  return {
    epc: tagFor(player),
    stationNumber: station,
    role,
    detectedAt: new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// A group to demonstrate against
// -----------------------------------------------------------------------------
// The kiosk only lists groups whose round is live right now, so with no wave
// scheduled there is nothing to open and nothing to review. Demo mode adds
// one obviously-fake group in front of the real ones. Everything about it —
// roster, scores, detections — lives in React state for the length of the
// visit: it is never read from or written to the database, so no leaderboard,
// booking or capacity number can be touched by a demo.

export const DEMO_GROUP_ID = "demo-group";

/** Pre-logged stations, chosen so both game states are one tap apart:
 *  Station 3 is the group's only outstanding one, so an end-gate read there
 *  is the end of their round ("round complete"), while an end-gate read at
 *  any other station is an ordinary station finish. */
export const DEMO_LOGGED_STATIONS = [1, 2, 4, 5];

export const DEMO_ROSTER: { id: string; name: string; ballTagId: string | null }[] = [
  { id: "demo-p1", name: "Mika", ballTagId: "E280689400005011AF3C0001" },
  { id: "demo-p2", name: "Ravi", ballTagId: "E280689400005011AF3C0002" },
  { id: "demo-p3", name: "Jo", ballTagId: null }, // checked in without a ball
];

export function demoScores(): Record<string, Record<number, number>> {
  const strokes = [3, 4, 2];
  return Object.fromEntries(
    DEMO_ROSTER.map((player, i) => [
      player.id,
      Object.fromEntries(DEMO_LOGGED_STATIONS.map((station) => [station, strokes[i % strokes.length]])),
    ])
  );
}
