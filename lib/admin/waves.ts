// FILE: lib/admin/waves.ts
// -----------------------------------------------------------------------------
// Staff-side reads for the admin panel: wave list with booking counts, and a
// single wave's full detail including its bookings and (staff-only) pairing
// profiles. Only ever called from routes proxy.ts has already gated.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import { toWaveView, type WaveRow, type WaveView } from "@/lib/booking/waves";

export interface AdminWaveListItem extends WaveView {
  paidBookingCount: number;
}

export async function listWavesForAdmin(): Promise<AdminWaveListItem[]> {
  const { data: waveRows, error } = await supabaseAdmin
    .from("waves")
    .select("id, date, start_time, capacity, booked, status")
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error || !waveRows) {
    console.error("listWavesForAdmin: waves query failed:", error?.message);
    return [];
  }

  const { data: bookingRows, error: bookingsError } = await supabaseAdmin
    .from("bookings")
    .select("wave_id")
    .eq("status", "paid");

  if (bookingsError) {
    console.error("listWavesForAdmin: bookings query failed:", bookingsError.message);
  }

  const countByWave = new Map<string, number>();
  for (const row of bookingRows ?? []) {
    countByWave.set(row.wave_id, (countByWave.get(row.wave_id) ?? 0) + 1);
  }

  return (waveRows as WaveRow[]).map((row) => ({
    ...toWaveView(row),
    paidBookingCount: countByWave.get(row.id) ?? 0,
  }));
}

export interface AdminBookingRow {
  id: string;
  leadName: string;
  leadEmail: string;
  partyType: "solo" | "pair" | "group";
  headcount: number;
  status: "pending" | "paid" | "cancelled";
  amountPaidCents: number;
  currency: string;
  pairOptIn: boolean;
  pairing: { ageBand: string | null; interests: string[]; bio: string | null } | null;
}

export interface AdminWaveDetail {
  wave: WaveView;
  bookings: AdminBookingRow[];
}

export async function fetchWaveAdminDetail(waveId: string): Promise<AdminWaveDetail | null> {
  const { data: waveRow, error: waveError } = await supabaseAdmin
    .from("waves")
    .select("id, date, start_time, capacity, booked, status")
    .eq("id", waveId)
    .maybeSingle();

  if (waveError || !waveRow) return null;

  const { data: bookingRows, error: bookingsError } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, lead_name, lead_email, party_type, headcount, status, amount_paid_cents, currency, pair_opt_in, pairing_profiles(age_band, interests, bio)"
    )
    .eq("wave_id", waveId)
    .order("created_at", { ascending: true });

  if (bookingsError) {
    console.error("fetchWaveAdminDetail: bookings query failed:", bookingsError.message);
  }

  const bookings: AdminBookingRow[] = (bookingRows ?? []).map((b) => {
    const pairing = Array.isArray(b.pairing_profiles) ? b.pairing_profiles[0] : b.pairing_profiles;
    return {
      id: b.id,
      leadName: b.lead_name,
      leadEmail: b.lead_email,
      partyType: b.party_type,
      headcount: b.headcount,
      status: b.status,
      amountPaidCents: b.amount_paid_cents,
      currency: b.currency,
      pairOptIn: b.pair_opt_in,
      pairing: pairing ? { ageBand: pairing.age_band, interests: pairing.interests, bio: pairing.bio } : null,
    };
  });

  return { wave: toWaveView(waveRow as WaveRow), bookings };
}
