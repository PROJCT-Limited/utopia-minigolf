// FILE: lib/scoring/leaderboardRepo.ts
// -----------------------------------------------------------------------------
// Read-side aggregation for the homepage leaderboard. Fetches raw
// station_scores (with nested player/wave info via Supabase's nested-select
// syntax) and aggregates in JS — same "fetch raw, aggregate in JS" pattern
// lib/admin/partners.ts's commission report already uses, rather than a SQL
// view. Only players with all 5 stations filled count as a complete round.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatWaveDate } from "@/app/utils/formatWave";
import { todayInHongKong } from "./activeWindow";

export type LeaderboardRange = "day" | "month" | "all";

export interface LeaderboardRow {
  rank: number;
  player: string;
  context: string;
  strokes: number;
}

interface PlayerAgg {
  name: string;
  date: string;
  startTime: string;
  strokesByStation: Map<number, number>;
}

function inRange(date: string, range: LeaderboardRange, today: string): boolean {
  if (range === "day") return date === today;
  if (range === "month") return date.slice(0, 7) === today.slice(0, 7);
  return true;
}

export async function fetchLeaderboard(range: LeaderboardRange, limit = 10): Promise<LeaderboardRow[]> {
  const today = todayInHongKong();
  const players = new Map<string, PlayerAgg>();

  const { data: bookingScores, error: bookingError } = await supabaseAdmin
    .from("station_scores")
    .select(
      "strokes, station_number, booking_player_id, booking_players(name, bookings(waves(date, start_time)))"
    )
    .not("booking_player_id", "is", null);
  if (bookingError) console.error("fetchLeaderboard: booking scores query failed:", bookingError.message);

  for (const row of bookingScores ?? []) {
    const bp = row.booking_players as unknown as {
      name: string;
      bookings: { waves: { date: string; start_time: string } } | null;
    } | null;
    const wave = bp?.bookings?.waves;
    if (!bp || !wave) continue;

    const key = `booking:${row.booking_player_id}`;
    const existing = players.get(key) ?? {
      name: bp.name,
      date: wave.date,
      startTime: wave.start_time,
      strokesByStation: new Map<number, number>(),
    };
    existing.strokesByStation.set(row.station_number, row.strokes);
    players.set(key, existing);
  }

  const rows = Array.from(players.values())
    .filter((p) => p.strokesByStation.size === 5 && inRange(p.date, range, today))
    .map((p) => ({
      player: p.name,
      context: `${formatWaveDate(p.date)}, ${p.startTime.slice(0, 5)}`,
      strokes: Array.from(p.strokesByStation.values()).reduce((sum, s) => sum + s, 0),
    }))
    .sort((a, b) => a.strokes - b.strokes)
    .slice(0, limit)
    .map((row, i) => ({ rank: i + 1, ...row }));

  return rows;
}
