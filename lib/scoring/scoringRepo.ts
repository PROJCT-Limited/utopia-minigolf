// FILE: lib/scoring/scoringRepo.ts
// -----------------------------------------------------------------------------
// DB access for the kiosk: which groups are currently playing, each group's
// player roster (created on first check-in), and reading/writing station
// scores. A group is always a booking — the parallel "public session" kind
// this used to carry alongside it is gone, so scores hang off
// station_scores.booking_player_id only.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TicketType } from "@/lib/booking/pricing";
import { isCurrentlyActive, todayInHongKong, waveActiveWindow } from "./activeWindow";

export interface CurrentGroup {
  id: string;
  timeLabel: string;
  ticketType: TicketType;
  displayName: string;
  playerCount: number;
  /** ISO timestamps bracketing this wave's "active" window — kiosk scopes
   *  its RFID feed queries to [windowStartIso, windowEndIso]. */
  windowStartIso: string;
  windowEndIso: string;
}

interface WaveTiming {
  date: string;
  startTime: string;
}

async function todaysWaveTimings(): Promise<Map<string, WaveTiming>> {
  const today = todayInHongKong();
  const { data, error } = await supabaseAdmin.from("waves").select("id, date, start_time").eq("date", today);
  if (error) {
    console.error("todaysWaveTimings: query failed:", error.message);
    return new Map();
  }
  return new Map((data ?? []).map((w) => [w.id, { date: w.date, startTime: w.start_time }]));
}

export async function fetchCurrentGroups(): Promise<CurrentGroup[]> {
  const waveTimings = await todaysWaveTimings();
  const waveIds = Array.from(waveTimings.keys());
  if (waveIds.length === 0) return [];

  const now = new Date();
  const groups: CurrentGroup[] = [];

  const { data: bookingRows, error: bookingsError } = await supabaseAdmin
    .from("bookings")
    .select("id, wave_id, lead_name, headcount, present_headcount, ticket_type")
    .eq("status", "paid")
    .in("wave_id", waveIds);
  if (bookingsError) console.error("fetchCurrentGroups: bookings query failed:", bookingsError.message);

  for (const b of bookingRows ?? []) {
    const wave = waveTimings.get(b.wave_id);
    if (!wave || !isCurrentlyActive(wave, b.ticket_type, now)) continue;
    const { start, end } = waveActiveWindow(wave.date, wave.startTime, b.ticket_type);
    groups.push({
      id: b.id,
      timeLabel: wave.startTime.slice(0, 5),
      ticketType: b.ticket_type,
      displayName: `${b.lead_name}’s group`,
      // What the door confirmed beats what was sold: a booking for four whose
      // fourth didn't show asks for three names here, not four.
      playerCount: b.present_headcount ?? b.headcount,
      windowStartIso: start.toISOString(),
      windowEndIso: end.toISOString(),
    });
  }

  return groups.sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
}

export interface RosterPlayer {
  id: string;
  name: string;
  /** EPC currently linked to this player via check-in, or null if not
   *  checked in / already released. Set during app/checkin/ (see
   *  migrations/018_checkin.sql). */
  ballTagId: string | null;
}

export async function fetchRosterForGroup(bookingId: string): Promise<RosterPlayer[]> {
  const { data, error } = await supabaseAdmin
    .from("booking_players")
    .select("id, name, ball_tag_id")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("fetchRosterForGroup: booking_players query failed:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({ id: r.id, name: r.name, ballTagId: r.ball_tag_id }));
}

export async function createBookingRoster(bookingId: string, names: string[]): Promise<RosterPlayer[]> {
  const rows = names.map((name) => ({ booking_id: bookingId, name: name.trim() })).filter((r) => r.name.length > 0);
  if (rows.length === 0) return [];

  const { data, error } = await supabaseAdmin.from("booking_players").insert(rows).select("id, name, ball_tag_id");
  if (error) {
    console.error("createBookingRoster: insert failed:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({ id: r.id, name: r.name, ballTagId: r.ball_tag_id }));
}

export async function fetchScoresForPlayer(playerId: string): Promise<Record<number, number>> {
  const { data, error } = await supabaseAdmin
    .from("station_scores")
    .select("station_number, strokes")
    .eq("booking_player_id", playerId);

  if (error) {
    console.error("fetchScoresForPlayer: query failed:", error.message);
    return {};
  }

  const scores: Record<number, number> = {};
  for (const row of data ?? []) scores[row.station_number] = row.strokes;
  return scores;
}

/** Every player's scores, keyed by player id then station number — used to
 * show who in the group has already logged the station they're all on. */
export async function fetchScoresForRoster(
  playerIds: string[]
): Promise<Record<string, Record<number, number>>> {
  if (playerIds.length === 0) return {};

  const { data, error } = await supabaseAdmin
    .from("station_scores")
    .select("booking_player_id, station_number, strokes")
    .in("booking_player_id", playerIds);

  if (error) {
    console.error("fetchScoresForRoster: query failed:", error.message);
    return {};
  }

  const scores: Record<string, Record<number, number>> = {};
  for (const row of data ?? []) {
    const playerId = (row as Record<string, string>).booking_player_id;
    scores[playerId] ??= {};
    scores[playerId][row.station_number] = row.strokes;
  }
  return scores;
}

export async function saveStationScore(
  playerId: string,
  stationNumber: number,
  strokes: number
): Promise<{ ok: boolean; error?: string }> {
  if (!Number.isInteger(stationNumber) || stationNumber < 1 || stationNumber > 5) {
    return { ok: false, error: "Invalid station." };
  }
  if (!Number.isInteger(strokes) || strokes < 1 || strokes > 20) {
    return { ok: false, error: "Strokes must be between 1 and 20." };
  }

  const { error } = await supabaseAdmin
    .from("station_scores")
    .upsert(
      { booking_player_id: playerId, station_number: stationNumber, strokes, updated_at: new Date().toISOString() },
      { onConflict: "booking_player_id,station_number" }
    );

  if (error) {
    console.error("saveStationScore: upsert failed:", error.message);
    return { ok: false, error: "Couldn't save that score. Please try again." };
  }
  return { ok: true };
}

// -----------------------------------------------------------------------------
// RFID feed (raw ball_detections rows written by relay/rfid_to_supabase.py).
// The relay stays dumb — it only writes antenna-port metadata; player
// resolution happens here at read time via booking_players.ball_tag_id.
// -----------------------------------------------------------------------------

export interface BallDetection {
  epc: string;
  stationNumber: number;
  role: "start" | "end";
  detectedAt: string;
}

export interface BallDetectionsResult {
  /** Detections grouped by epc. Only epcs that belong to a roster player
   *  appear here. */
  rowsByEpc: Record<string, BallDetection[]>;
  /** EPCs seen at this station in this window that don't belong to any
   *  roster player (no active booking_players.ball_tag_id match). */
  unboundEpcs: string[];
}

/** Fetch the RFID timeline for a group's roster at one station within the
 *  wave's active window. Two flat queries — matches scoringRepo.ts style;
 *  embedded joins (used in leaderboardRepo.ts) join INTO booking_players,
 *  which isn't the shape we need here.
 *  Returns empty result on error; never throws (consistent with the rest
 *  of this module). */
export async function fetchBallDetectionsForGroup(
  rosterPlayers: { id: string; ballTagId: string | null }[],
  stationNumber: number,
  windowStartIso: string,
  windowEndIso: string
): Promise<BallDetectionsResult> {
  const empty: BallDetectionsResult = { rowsByEpc: {}, unboundEpcs: [] };
  const epcs = rosterPlayers.map((p) => p.ballTagId).filter((e): e is string => !!e);

  // 1) Bound detections — epcs belong to the roster.
  let boundRows: Array<{ epc: string; station_number: number; role: "start" | "end"; detected_at: string }> = [];
  if (epcs.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("ball_detections")
      .select("epc, station_number, role, detected_at")
      .eq("station_number", stationNumber)
      .in("epc", epcs)
      .gte("detected_at", windowStartIso)
      .lte("detected_at", windowEndIso)
      .order("detected_at", { ascending: true });
    if (error) {
      console.error("fetchBallDetectionsForGroup: bound:", error.message);
      return empty;
    }
    boundRows = data ?? [];
  }

  // 2) Unbound detections — anything at this station in this window with a
  // role, minus the bound set. Legacy rows have role=NULL and are skipped.
  const unboundQuery = supabaseAdmin
    .from("ball_detections")
    .select("epc")
    .eq("station_number", stationNumber)
    .gte("detected_at", windowStartIso)
    .lte("detected_at", windowEndIso)
    .not("role", "is", null);
  const { data: unboundRows, error: unboundErr } = epcs.length === 0
    ? await unboundQuery
    : await unboundQuery.not("epc", "in", `(${epcs.map((e) => `"${e}"`).join(",")})`);
  if (unboundErr) console.error("fetchBallDetectionsForGroup: unbound:", unboundErr.message);

  const rowsByEpc: Record<string, BallDetection[]> = {};
  for (const r of boundRows) {
    (rowsByEpc[r.epc] ??= []).push({
      epc: r.epc,
      stationNumber: r.station_number,
      role: r.role,
      detectedAt: r.detected_at,
    });
  }
  const unboundEpcs = Array.from(new Set((unboundRows ?? []).map((r) => r.epc)));
  return { rowsByEpc, unboundEpcs };
}

/**
 * Every detection in a wave's window, at any station.
 *
 * The station-scoped query above answers "what happened at station 3"; this
 * answers "where is this group right now", which is what lets the kiosk
 * follow a ball instead of being parked on a station somebody had to choose
 * by hand. One query rather than the two that version needs: the roster's
 * tags are matched in JS, so a ball nobody checked in still comes back with
 * its timestamp and station and can be announced as an unknown ball rather
 * than silently dropped.
 *
 * Legacy rows (written by the relay before `role` was emitted) carry
 * role=NULL and are skipped — with no gate there's nothing to say about them.
 */
export async function fetchDetectionsInWindow(
  windowStartIso: string,
  windowEndIso: string
): Promise<BallDetection[]> {
  const { data, error } = await supabaseAdmin
    .from("ball_detections")
    .select("epc, station_number, role, detected_at")
    .gte("detected_at", windowStartIso)
    .lte("detected_at", windowEndIso)
    .not("role", "is", null)
    .order("detected_at", { ascending: true });

  if (error) {
    console.error("fetchDetectionsInWindow: query failed:", error.message);
    throw new Error(error.message); // the kiosk shows a dead feed rather than an idle course
  }

  return (data ?? []).map((row) => ({
    epc: row.epc,
    stationNumber: row.station_number,
    role: row.role,
    detectedAt: row.detected_at,
  }));
}
