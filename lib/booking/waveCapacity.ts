// FILE: lib/booking/waveCapacity.ts
// -----------------------------------------------------------------------------
// The one place wave-slot capacity gets read, checked, and mutated. Used by
// confirmBooking.ts and reschedule.ts, which previously each reimplemented "read, clamp, update, flip full status"
// independently — consolidated here so the wave-slot unit (as opposed to the
// old raw-headcount unit) only has one implementation to get right.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface WaveCapacitySnapshot {
  waveSlotsUsed: number;
  totalWaveSlots: number;
  status: "provisional" | "confirmed" | "full";
}

export function hasWaveSlotsAvailable(wave: WaveCapacitySnapshot, slotsNeeded: number): boolean {
  return wave.status !== "full" && wave.waveSlotsUsed + slotsNeeded <= wave.totalWaveSlots;
}

export async function addWaveSlots(waveId: string, slotsToAdd: number): Promise<void> {
  const { data: wave, error } = await supabaseAdmin
    .from("waves")
    .select("id, total_wave_slots, wave_slots_used")
    .eq("id", waveId)
    .maybeSingle();

  if (error || !wave) {
    console.error("addWaveSlots: wave not found", waveId, error?.message);
    return;
  }

  const newUsed = Math.min(wave.total_wave_slots, wave.wave_slots_used + slotsToAdd);
  await supabaseAdmin
    .from("waves")
    .update({ wave_slots_used: newUsed, status: newUsed >= wave.total_wave_slots ? "full" : undefined })
    .eq("id", waveId);
}

export async function releaseWaveSlots(waveId: string, slotsToRelease: number): Promise<void> {
  const { data: wave, error } = await supabaseAdmin
    .from("waves")
    .select("id, total_wave_slots, wave_slots_used, status")
    .eq("id", waveId)
    .maybeSingle();

  if (error || !wave) {
    console.error("releaseWaveSlots: wave not found", waveId, error?.message);
    return;
  }

  const newUsed = Math.max(0, wave.wave_slots_used - slotsToRelease);
  await supabaseAdmin
    .from("waves")
    .update({ wave_slots_used: newUsed, status: wave.status === "full" ? "confirmed" : wave.status })
    .eq("id", waveId);
}
