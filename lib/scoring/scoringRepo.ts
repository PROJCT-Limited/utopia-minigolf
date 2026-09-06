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
import { isCurrentlyActive, todayInHongKong } from "./activeWindow";

export interface CurrentGroup {
  id: string;
  timeLabel: string;
  ticketType: TicketType;
  displayName: string;
  playerCount: number;
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
    .select("id, wave_id, lead_name, headcount, ticket_type")
    .eq("status", "paid")
    .in("wave_id", waveIds);
  if (bookingsError) console.error("fetchCurrentGroups: bookings query failed:", bookingsError.message);

  for (const b of bookingRows ?? []) {
    const wave = waveTimings.get(b.wave_id);
    if (!wave || !isCurrentlyActive(wave, b.ticket_type, now)) continue;
    groups.push({
      id: b.id,
      timeLabel: wave.startTime.slice(0, 5),
      ticketType: b.ticket_type,
      displayName: `${b.lead_name}’s group`,
      playerCount: b.headcount,
    });
  }

  return groups.sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
}

export interface RosterPlayer {
  id: string;
  name: string;
}

export async function fetchRosterForGroup(bookingId: string): Promise<RosterPlayer[]> {
  const { data, error } = await supabaseAdmin
    .from("booking_players")
    .select("id, name")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("fetchRosterForGroup: booking_players query failed:", error.message);
    return [];
  }
  return data ?? [];
}

export async function createBookingRoster(bookingId: string, names: string[]): Promise<RosterPlayer[]> {
  const rows = names.map((name) => ({ booking_id: bookingId, name: name.trim() })).filter((r) => r.name.length > 0);
  if (rows.length === 0) return [];

  const { data, error } = await supabaseAdmin.from("booking_players").insert(rows).select("id, name");
  if (error) {
    console.error("createBookingRoster: insert failed:", error.message);
    return [];
  }
  return data ?? [];
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
