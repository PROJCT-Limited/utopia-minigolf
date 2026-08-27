// FILE: lib/booking/wavesRepo.ts
// -----------------------------------------------------------------------------
// Supabase-backed reads of `waves`, thin wrappers around waves.ts's pure
// toWaveView(). Split out from waves.ts so that file stays import-safe
// without env vars (see waves.ts's header comment).
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import { BOOKABLE_WINDOW_START, BOOKABLE_WINDOW_END, toWaveView, type WaveRow, type WaveView } from "./waves";

export async function fetchUpcomingWaves(): Promise<WaveView[]> {
  const { data, error } = await supabaseAdmin
    .from("waves")
    .select("id, date, start_time, total_wave_slots, wave_slots_used, status")
    .gte("date", BOOKABLE_WINDOW_START) // nothing outside the open booking window is bookable
    .lte("date", BOOKABLE_WINDOW_END)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("fetchUpcomingWaves: query failed:", error.message);
    return [];
  }

  return (data as WaveRow[]).map(toWaveView);
}

export async function fetchWaveById(waveId: string): Promise<WaveView | null> {
  const { data, error } = await supabaseAdmin
    .from("waves")
    .select("id, date, start_time, total_wave_slots, wave_slots_used, status")
    .eq("id", waveId)
    .maybeSingle();

  if (error || !data) return null;
  return toWaveView(data as WaveRow);
}
