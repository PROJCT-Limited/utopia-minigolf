// FILE: lib/booking/waveCapacity.ts
// -----------------------------------------------------------------------------
// The one place a start time's capacity gets read, checked, and mutated. Used
// by confirmBooking.ts and reschedule.ts, which previously each reimplemented
// "read, clamp, update, flip full status" independently.
//
// Capacity is people, not groups (migrations/017_people_capacity.sql): a
// booking holds as many spaces as it has players, and any mix of groups fits
// while the people total stays within the start time's `people_capacity`. The
// group counter (`wave_slots_used`) is still kept in step because the admin
// panel reports groups beside people — but it gates nothing.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface WaveCapacitySnapshot {
  peopleUsed: number;
  peopleCapacity: number;
  peopleLeft: number;
  status: "provisional" | "confirmed" | "full";
}

/**
 * Can a group of `headcount` still be seated here? Mirrors hasRoomFor() in
 * waves.ts (the client-safe copy the picker uses) — this is the server-side
 * check that actually decides, since the client's view of a wave can be
 * seconds stale.
 */
export function hasRoomForGroup(wave: WaveCapacitySnapshot, headcount: number): boolean {
  return wave.status !== "full" && wave.peopleUsed + headcount <= wave.peopleCapacity;
}

/** Seats a group of `headcount` at `waveId`, flipping the wave full if it fills. */
export async function reserveSeats(waveId: string, headcount: number): Promise<void> {
  const { data: wave, error } = await supabaseAdmin
    .from("waves")
    .select("id, people_capacity, people_used, wave_slots_used")
    .eq("id", waveId)
    .maybeSingle();

  if (error || !wave) {
    console.error("reserveSeats: wave not found", waveId, error?.message);
    return;
  }

  const newPeopleUsed = Math.min(wave.people_capacity, wave.people_used + headcount);
  await supabaseAdmin
    .from("waves")
    .update({
      people_used: newPeopleUsed,
      wave_slots_used: wave.wave_slots_used + 1,
      status: newPeopleUsed >= wave.people_capacity ? "full" : undefined,
    })
    .eq("id", waveId);
}

/** Gives a group's seats back — a reschedule away, or a cancelled booking. */
export async function releaseSeats(waveId: string, headcount: number): Promise<void> {
  const { data: wave, error } = await supabaseAdmin
    .from("waves")
    .select("id, people_capacity, people_used, wave_slots_used, status")
    .eq("id", waveId)
    .maybeSingle();

  if (error || !wave) {
    console.error("releaseSeats: wave not found", waveId, error?.message);
    return;
  }

  const newPeopleUsed = Math.max(0, wave.people_used - headcount);
  await supabaseAdmin
    .from("waves")
    .update({
      people_used: newPeopleUsed,
      wave_slots_used: Math.max(0, wave.wave_slots_used - 1),
      status: wave.status === "full" ? "confirmed" : wave.status,
    })
    .eq("id", waveId);
}
