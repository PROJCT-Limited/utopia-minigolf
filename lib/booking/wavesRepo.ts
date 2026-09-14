// FILE: lib/booking/wavesRepo.ts
// -----------------------------------------------------------------------------
// Supabase-backed reads of `waves`, thin wrappers around waves.ts's pure
// toWaveView(). Split out from waves.ts so that file stays import-safe
// without env vars (see waves.ts's header comment).
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import { BOOKABLE_WINDOW_START, BOOKABLE_WINDOW_END, toWaveView, type WaveRow, type WaveView } from "./waves";

const WAVE_COLUMNS = "id, date, start_time, people_capacity, people_used, wave_slots_used, status, visibility";

export async function fetchUpcomingWaves(): Promise<WaveView[]> {
  const { data, error } = await supabaseAdmin
    .from("waves")
    .select(WAVE_COLUMNS)
    .gte("date", BOOKABLE_WINDOW_START) // nothing outside the open booking window is bookable
    .lte("date", BOOKABLE_WINDOW_END)
    // Unlisted start times are reachable only through their private link —
    // never the calendar, and never a reschedule target. This is the one
    // query that decides that, so it's the one place the rule lives.
    .eq("visibility", "public")
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("fetchUpcomingWaves: query failed:", error.message);
    return [];
  }

  return (data as WaveRow[]).map(toWaveView);
}

/**
 * By id, listed or not. Hidden start times have to resolve here or a guest
 * holding a private booking couldn't pay for it, see it confirmed, or check
 * in — so callers that must not accept an unlisted wave (the reschedule
 * picker, say) check `isHidden` themselves rather than relying on this.
 */
export async function fetchWaveById(waveId: string): Promise<WaveView | null> {
  const { data, error } = await supabaseAdmin
    .from("waves")
    .select(WAVE_COLUMNS)
    .eq("id", waveId)
    .maybeSingle();

  if (error || !data) return null;
  return toWaveView(data as WaveRow);
}

/**
 * The private link's only door. Tokens are 32 random bytes (see
 * lib/admin/privateLink.ts), so an unlisted start time is as reachable as
 * the link is — and no more.
 */
export async function fetchWaveByPrivateToken(token: string): Promise<WaveView | null> {
  if (!token) return null;

  const { data, error } = await supabaseAdmin
    .from("waves")
    .select(WAVE_COLUMNS)
    .eq("private_token", token)
    .maybeSingle();

  if (error || !data) return null;
  return toWaveView(data as WaveRow);
}
