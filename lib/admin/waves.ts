// FILE: lib/admin/waves.ts
// -----------------------------------------------------------------------------
// Staff-side reads for the admin panel: wave list with booking counts, and a
// single wave's full detail including its bookings and (staff-only) pairing
// profiles. Only ever called from routes proxy.ts has already gated.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import { toWaveView, type WaveRow, type WaveView } from "@/lib/booking/waves";
import type { TicketType } from "@/lib/booking/pricing";

export interface AdminWaveListItem extends WaveView {
  /** Groups (paid bookings) at this start time, counted from `bookings`. */
  paidBookingCount: number;
  /** People across those groups — the figure the 15-per-start-time cap is on. */
  paidPeopleCount: number;
  /**
   * True when the `people_used` counter that actually gates booking disagrees
   * with the paid bookings behind it. Should never happen; surfaced rather
   * than hidden because a stuck counter silently blocks (or oversells) a
   * start time, and the counter — not this table's sum — is what customers hit.
   */
  capacityCounterDrift: boolean;
}

export async function listWavesForAdmin(): Promise<AdminWaveListItem[]> {
  const { data: waveRows, error } = await supabaseAdmin
    .from("waves")
    .select("id, date, start_time, people_capacity, people_used, wave_slots_used, status")
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error || !waveRows) {
    console.error("listWavesForAdmin: waves query failed:", error?.message);
    return [];
  }

  const { data: bookingRows, error: bookingsError } = await supabaseAdmin
    .from("bookings")
    .select("wave_id, headcount")
    .eq("status", "paid");

  if (bookingsError) {
    console.error("listWavesForAdmin: bookings query failed:", bookingsError.message);
  }

  const byWave = new Map<string, { groups: number; people: number }>();
  for (const row of bookingRows ?? []) {
    const tally = byWave.get(row.wave_id) ?? { groups: 0, people: 0 };
    tally.groups += 1;
    tally.people += row.headcount;
    byWave.set(row.wave_id, tally);
  }

  return (waveRows as WaveRow[]).map((row) => {
    const view = toWaveView(row);
    const tally = byWave.get(row.id) ?? { groups: 0, people: 0 };
    return {
      ...view,
      paidBookingCount: tally.groups,
      paidPeopleCount: tally.people,
      capacityCounterDrift: !bookingsError && tally.people !== view.peopleUsed,
    };
  });
}

export interface AdminBookingRow {
  id: string;
  leadName: string;
  leadEmail: string;
  partyType: "solo" | "pair" | "group";
  headcount: number;
  ticketType: TicketType;
  status: "pending" | "paid" | "cancelled";
  amountPaidCents: number;
  currency: string;
}

export interface AdminWaveDetail {
  wave: WaveView;
  bookings: AdminBookingRow[];
  /** Groups and people from the paid bookings below — see AdminWaveListItem. */
  paidBookingCount: number;
  paidPeopleCount: number;
}

export async function fetchWaveAdminDetail(waveId: string): Promise<AdminWaveDetail | null> {
  const { data: waveRow, error: waveError } = await supabaseAdmin
    .from("waves")
    .select("id, date, start_time, people_capacity, people_used, wave_slots_used, status")
    .eq("id", waveId)
    .maybeSingle();

  if (waveError || !waveRow) return null;

  const { data: bookingRows, error: bookingsError } = await supabaseAdmin
    .from("bookings")
    .select("id, lead_name, lead_email, party_type, headcount, ticket_type, status, amount_paid_cents, currency")
    .eq("wave_id", waveId)
    .order("created_at", { ascending: true });

  if (bookingsError) {
    console.error("fetchWaveAdminDetail: bookings query failed:", bookingsError.message);
  }

  const bookings: AdminBookingRow[] = (bookingRows ?? []).map((b) => ({
    id: b.id,
    leadName: b.lead_name,
    leadEmail: b.lead_email,
    partyType: b.party_type,
    headcount: b.headcount,
    ticketType: b.ticket_type,
    status: b.status,
    amountPaidCents: b.amount_paid_cents,
    currency: b.currency,
  }));

  const paid = bookings.filter((b) => b.status === "paid");

  return {
    wave: toWaveView(waveRow as WaveRow),
    bookings,
    paidBookingCount: paid.length,
    paidPeopleCount: paid.reduce((sum, b) => sum + b.headcount, 0),
  };
}
