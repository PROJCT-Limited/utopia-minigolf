// FILE: lib/scoring/activeWindow.ts
// -----------------------------------------------------------------------------
// Pure "who's playing right now" window math — no Supabase import here on
// purpose (same reasoning as lib/booking/waves.ts), so this is testable
// without a database. A round is "active" from a few minutes before its
// wave's start time (early check-in) through its ticket type's full
// duration plus a wrap-up buffer to finish entering scores afterward.
// -----------------------------------------------------------------------------

import type { TicketType } from "@/lib/booking/pricing";

export const ROUND_DURATION_MINUTES: Record<TicketType, number> = {
  standard: 30, // one 30-min run
  unlimited: 60, // the full hour, with re-entry
};

const CHECK_IN_BUFFER_MINUTES = 10;
const WRAP_UP_BUFFER_MINUTES = 15;

// The venue is in Hong Kong (UTC+8, no DST) — wave dates/times are naive
// venue-local wall-clock values throughout this app, so "now" has to be
// interpreted the same way for a correct comparison.
export function waveStartInstant(date: string, startTime: string): Date {
  return new Date(`${date}T${startTime}+08:00`);
}

export function isCurrentlyActive(
  wave: { date: string; startTime: string },
  ticketType: TicketType,
  now: Date
): boolean {
  const start = waveStartInstant(wave.date, wave.startTime);
  const durationMs = ROUND_DURATION_MINUTES[ticketType] * 60_000;
  const windowStart = new Date(start.getTime() - CHECK_IN_BUFFER_MINUTES * 60_000);
  const windowEnd = new Date(start.getTime() + durationMs + WRAP_UP_BUFFER_MINUTES * 60_000);
  return now >= windowStart && now <= windowEnd;
}

/** Sibling of isCurrentlyActive — returns the actual start/end instants so
 *  callers (e.g. the kiosk RFID feed) can scope Supabase queries to this
 *  wave's window without re-deriving the constants. */
export function waveActiveWindow(
  date: string,
  startTime: string,
  ticketType: TicketType
): { start: Date; end: Date } {
  const start = waveStartInstant(date, startTime);
  const durationMs = ROUND_DURATION_MINUTES[ticketType] * 60_000;
  return {
    start: new Date(start.getTime() - CHECK_IN_BUFFER_MINUTES * 60_000),
    end: new Date(start.getTime() + durationMs + WRAP_UP_BUFFER_MINUTES * 60_000),
  };
}

/** "YYYY-MM-DD" for the current date at the venue (Hong Kong, UTC+8). */
export function todayInHongKong(now: Date = new Date()): string {
  const hkMs = now.getTime() + 8 * 60 * 60_000;
  return new Date(hkMs).toISOString().slice(0, 10);
}
