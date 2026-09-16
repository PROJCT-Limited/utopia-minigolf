// FILE: lib/stats/dailyDigestRepo.ts
// -----------------------------------------------------------------------------
// Supabase-backed reads for the daily digest, wrapping the pure summarizeDay()
// in dailyDigest.ts.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  digestDayFor,
  summarizeDay,
  type DigestBookingRow,
  type DigestEventRow,
  type DigestStats,
  type DigestWaveRow,
} from "./dailyDigest";

export async function fetchDailyDigest(day: string = digestDayFor()): Promise<DigestStats> {
  // `waves` runs to hundreds of rows, past Supabase's default page size, so
  // both reads page explicitly rather than trusting one request to carry the
  // whole season — a truncated read here would quietly understate the season.
  const waves = await fetchAll<DigestWaveRow>("waves", "id, date, start_time, people_capacity");
  const bookings = await fetchAll<DigestBookingRow>(
    "bookings",
    "created_at, status, headcount, ticket_type, amount_paid_cents, wave_id"
  );
  const events = await fetchAll<DigestEventRow>("checkout_events", "type, created_at");

  return summarizeDay({ day, bookings, waves, events });
}

async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error(`fetchDailyDigest: ${table} query failed:`, error.message);
      break;
    }
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}
