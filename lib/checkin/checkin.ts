// FILE: lib/checkin/checkin.ts
// -----------------------------------------------------------------------------
// Pure check-in logic — no Supabase import here on purpose (same reasoning as
// lib/booking/waves.ts and lib/scoring/activeWindow.ts), so it's testable
// without a database and safe to import from the client component that drives
// the door tablet. DB access lives in checkinRepo.ts.
// -----------------------------------------------------------------------------

import { MAX_HEADCOUNT, MIN_HEADCOUNT } from "@/lib/booking/pricing";
import { waveStartInstant } from "@/lib/scoring/activeWindow";

/** How long before a start time the door will offer that slot to a walk-in. */
const WALK_IN_LOOKAHEAD_MINUTES = 20;
/** …and how long after it, before the slot is considered gone. */
const WALK_IN_GRACE_MINUTES = 15;

// -----------------------------------------------------------------------------
// Ball tags
// -----------------------------------------------------------------------------
// Readers differ in what they emit for the same ball — some pad the hex, some
// lower-case it, the keyboard-wedge kind sends a stray newline. Everything
// that touches a tag goes through normalizeBallTag first, so "a2", "#A2" and
// " A2\r" are one ball and not three.

export function normalizeBallTag(raw: string): string {
  return raw.trim().replace(/^#/, "").replace(/\s+/g, "").toUpperCase();
}

/** Tags are short alphanumeric codes — either the reader's hex or, when it's
 *  been typed in by hand off the sticker on the ball, something like "A2". */
export function isValidBallTag(raw: string): boolean {
  const tag = normalizeBallTag(raw);
  return /^[A-Z0-9][A-Z0-9-]{0,31}$/.test(tag);
}

/** How a tag is shown to staff: "#A2". */
export function formatBallTag(tag: string): string {
  return `#${normalizeBallTag(tag)}`;
}

// -----------------------------------------------------------------------------
// Roster
// -----------------------------------------------------------------------------

export interface RosterProgress {
  /** 1-based position of the player being registered — "Player 3 of 4". */
  position: number;
  total: number;
  complete: boolean;
}

export function rosterProgress(registeredCount: number, presentHeadcount: number): RosterProgress {
  const total = Math.max(0, presentHeadcount);
  const complete = registeredCount >= total;
  return {
    position: complete ? total : registeredCount + 1,
    total,
    complete,
  };
}

export function isValidPresentHeadcount(n: number): boolean {
  return Number.isInteger(n) && n >= MIN_HEADCOUNT && n <= MAX_HEADCOUNT;
}

/** A name is this player's leaderboard identity, so it's the one required
 *  field at the door. Email is collected when offered and never blocks. */
export function normalizePlayerName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function isValidPlayerName(raw: string): boolean {
  const name = normalizePlayerName(raw);
  return name.length > 0 && name.length <= 60;
}

// -----------------------------------------------------------------------------
// Walk-ins
// -----------------------------------------------------------------------------

export interface WalkInWaveCandidate {
  id: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM:SS"
}

/**
 * Which start time a walk-in gets put against: the one that's running now
 * (within a grace period of its start), else the next one about to open. A
 * walk-in still consumes that slot's people capacity like any other booking,
 * so the answer has to be a real wave and never "whatever's closest".
 */
export function pickWalkInWave<T extends WalkInWaveCandidate>(waves: T[], now: Date): T | null {
  const withinWindow = waves
    .map((wave) => ({ wave, startMs: waveStartInstant(wave.date, wave.startTime).getTime() }))
    .filter(
      ({ startMs }) =>
        now.getTime() >= startMs - WALK_IN_LOOKAHEAD_MINUTES * 60_000 &&
        now.getTime() <= startMs + WALK_IN_GRACE_MINUTES * 60_000
    )
    .sort((a, b) => a.startMs - b.startMs);

  if (withinWindow.length > 0) return withinWindow[0].wave;

  const upcoming = waves
    .map((wave) => ({ wave, startMs: waveStartInstant(wave.date, wave.startTime).getTime() }))
    .filter(({ startMs }) => startMs > now.getTime())
    .sort((a, b) => a.startMs - b.startMs);

  return upcoming[0]?.wave ?? null;
}

// -----------------------------------------------------------------------------
// Screen 1 search
// -----------------------------------------------------------------------------

/** Name search for the arrivals list — matches the lead booker, so an early
 *  or late guest can be found without scrolling the whole day. */
export function matchesSearch(leadName: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  return leadName.toLowerCase().includes(q);
}
