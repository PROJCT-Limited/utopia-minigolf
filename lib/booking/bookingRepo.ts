// FILE: lib/booking/bookingRepo.ts
// -----------------------------------------------------------------------------
// Read-side booking lookups for the confirmation page and its poll endpoint.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TicketType } from "./pricing";

export interface BookingSummary {
  id: string;
  leadName: string;
  partyType: "solo" | "pair" | "group";
  headcount: number;
  ticketType: TicketType;
  amountPaidCents: number;
  currency: string;
  status: "pending" | "paid" | "cancelled";
  waveDate: string;
  waveStartTime: string;
  waveStatus: "provisional" | "confirmed" | "full";
}

export async function fetchBookingSummary(bookingId: string): Promise<BookingSummary | null> {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, lead_name, party_type, headcount, ticket_type, amount_paid_cents, currency, status, waves(date, start_time, status)"
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) return null;

  const wave = Array.isArray(data.waves) ? data.waves[0] : data.waves;
  if (!wave) return null;

  return {
    id: data.id,
    leadName: data.lead_name,
    partyType: data.party_type,
    headcount: data.headcount,
    ticketType: data.ticket_type,
    amountPaidCents: data.amount_paid_cents,
    currency: data.currency,
    status: data.status,
    waveDate: wave.date,
    waveStartTime: wave.start_time,
    waveStatus: wave.status,
  };
}
