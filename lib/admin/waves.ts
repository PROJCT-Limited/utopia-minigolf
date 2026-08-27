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
  paidBookingCount: number;
}

export async function listWavesForAdmin(): Promise<AdminWaveListItem[]> {
  const { data: waveRows, error } = await supabaseAdmin
    .from("waves")
    .select("id, date, start_time, total_wave_slots, wave_slots_used, status")
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
  ticketType: TicketType;
  status: "pending" | "paid" | "cancelled";
  amountPaidCents: number;
  currency: string;
}

export interface AdminSessionParticipantRow {
  id: string;
  name: string;
  email: string;
  status: "pending" | "paid" | "cancelled";
  amountPaidCents: number;
  currency: string;
  isHost: boolean;
}

export interface AdminSessionRow {
  id: string;
  shareToken: string;
  maxPlayers: number;
  status: "open" | "full";
  ticketType: TicketType;
  participants: AdminSessionParticipantRow[];
}

export interface AdminWaveDetail {
  wave: WaveView;
  bookings: AdminBookingRow[];
  sessions: AdminSessionRow[];
}

export async function fetchWaveAdminDetail(waveId: string): Promise<AdminWaveDetail | null> {
  const { data: waveRow, error: waveError } = await supabaseAdmin
    .from("waves")
    .select("id, date, start_time, total_wave_slots, wave_slots_used, status")
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

  const { data: sessionRows, error: sessionsError } = await supabaseAdmin
    .from("sessions")
    .select(
      "id, share_token, max_players, status, ticket_type, session_participants(id, name, email, status, amount_paid_cents, currency, is_host)"
    )
    .eq("wave_id", waveId)
    .order("created_at", { ascending: true });

  if (sessionsError) {
    console.error("fetchWaveAdminDetail: sessions query failed:", sessionsError.message);
  }

  const sessions: AdminSessionRow[] = (sessionRows ?? []).map((s) => ({
    id: s.id,
    shareToken: s.share_token,
    maxPlayers: s.max_players,
    status: s.status,
    ticketType: s.ticket_type,
    participants: (s.session_participants ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      status: p.status,
      amountPaidCents: p.amount_paid_cents,
      currency: p.currency,
      isHost: p.is_host,
    })),
  }));

  return { wave: toWaveView(waveRow as WaveRow), bookings, sessions };
}
