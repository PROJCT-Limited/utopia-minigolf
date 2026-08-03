// FILE: lib/booking/reschedule.ts
// -----------------------------------------------------------------------------
// Self-serve reschedule for /manage/[token] — a booking may move to a
// different wave exactly once, and never within RESCHEDULE_CUTOFF_DAYS of a
// *confirmed* wave's date (provisional waves have no real date yet, so the
// cutoff only applies once a wave is confirmed).
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchWaveById } from "./wavesRepo";
import type { WaveView } from "./waves";
import { RESCHEDULE_CUTOFF_DAYS } from "./copy";
import { sendBookingRescheduled } from "@/lib/email/send";

export interface BookingForManage {
  id: string;
  waveId: string;
  leadName: string;
  leadEmail: string;
  partyType: "solo" | "pair" | "group";
  headcount: number;
  status: "pending" | "paid" | "cancelled";
  rescheduleUsed: boolean;
}

export async function fetchBookingByManageToken(token: string): Promise<BookingForManage | null> {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id, wave_id, lead_name, lead_email, party_type, headcount, status, reschedule_used")
    .eq("manage_token", token)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    waveId: data.wave_id,
    leadName: data.lead_name,
    leadEmail: data.lead_email,
    partyType: data.party_type,
    headcount: data.headcount,
    status: data.status,
    rescheduleUsed: data.reschedule_used,
  };
}

export function isPastRescheduleCutoff(wave: WaveView): boolean {
  if (wave.status !== "confirmed" && wave.status !== "full") return false; // no locked date yet
  const waveDate = new Date(`${wave.date}T00:00:00Z`);
  const cutoff = new Date(waveDate);
  cutoff.setUTCDate(cutoff.getUTCDate() - RESCHEDULE_CUTOFF_DAYS);
  return new Date() >= cutoff;
}

export type RescheduleResult =
  | { ok: true }
  | { ok: false; error: string };

export async function rescheduleBooking(token: string, newWaveId: string): Promise<RescheduleResult> {
  const booking = await fetchBookingByManageToken(token);
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.status !== "paid") return { ok: false, error: "This booking isn't confirmed yet." };
  if (booking.rescheduleUsed) return { ok: false, error: "This booking has already been rescheduled once." };

  const currentWave = await fetchWaveById(booking.waveId);
  if (currentWave && isPastRescheduleCutoff(currentWave)) {
    return { ok: false, error: "It's too close to your confirmed date to reschedule online — please contact us." };
  }

  const newWave = await fetchWaveById(newWaveId);
  if (!newWave) return { ok: false, error: "That wave no longer exists." };
  if (newWave.isFull || newWave.spotsLeft < booking.headcount) {
    return { ok: false, error: "Not enough spots left in that wave." };
  }
  if (isPastRescheduleCutoff(newWave)) {
    return { ok: false, error: "That wave is too close to its date to book online — please contact us." };
  }

  const { error: bookingUpdateError } = await supabaseAdmin
    .from("bookings")
    .update({ wave_id: newWaveId, reschedule_used: true, updated_at: new Date().toISOString() })
    .eq("id", booking.id);
  if (bookingUpdateError) {
    console.error("rescheduleBooking: booking update failed:", bookingUpdateError.message);
    return { ok: false, error: "Couldn't reschedule. Please try again." };
  }

  // Move the headcount off the old wave and onto the new one. Small accepted
  // race (same tolerance as the rest of this codebase's capacity bookkeeping):
  // two simultaneous reschedules could both read stale counts, worth it to
  // avoid a DB function for a single-operator, low-volume booking flow.
  if (currentWave) {
    const releasedBooked = Math.max(0, currentWave.booked - booking.headcount);
    await supabaseAdmin
      .from("waves")
      .update({
        booked: releasedBooked,
        status: currentWave.status === "full" ? "confirmed" : currentWave.status,
      })
      .eq("id", currentWave.id);
  }

  const newBooked = newWave.booked + booking.headcount;
  await supabaseAdmin
    .from("waves")
    .update({
      booked: newBooked,
      status: newBooked >= newWave.capacity ? "full" : newWave.status,
    })
    .eq("id", newWave.id);

  await sendBookingRescheduled(booking.id);

  return { ok: true };
}
