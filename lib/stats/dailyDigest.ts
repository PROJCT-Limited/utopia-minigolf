// FILE: lib/stats/dailyDigest.ts
// -----------------------------------------------------------------------------
// The numbers behind the daily digest email — pure functions over rows, with
// no Supabase import, so they're testable without a database or env vars
// (see dailyDigest.test.ts). The reads live in dailyDigestRepo.ts, the same
// split as lib/booking/waves.ts and wavesRepo.ts.
//
// "Today" is a Hong Kong day, not a UTC one. The server runs in UTC on
// Vercel, and a digest that cut the day at 08:00 local would put an evening's
// bookings in the wrong column — the same reasoning as the early bird
// deadline in lib/booking/pricing.ts.
// -----------------------------------------------------------------------------

import { todayInHongKong } from "@/lib/scoring/activeWindow";
import { BOOKABLE_WINDOW_END, BOOKABLE_WINDOW_START } from "@/lib/booking/waves";
import { TICKET_TYPE_LABELS, type TicketType } from "@/lib/booking/pricing";
import { CHECKOUT_FAILURE_TYPES, type CheckoutEventType } from "@/lib/booking/checkoutEvents";

export interface DigestBookingRow {
  created_at: string;
  status: "pending" | "paid" | "cancelled";
  headcount: number;
  ticket_type: TicketType;
  amount_paid_cents: number;
  wave_id: string;
}

export interface DigestEventRow {
  type: string;
  created_at: string;
}

export interface DigestWaveRow {
  id: string;
  date: string;
  start_time: string;
  people_capacity: number;
}

export interface BookedSlot {
  date: string;
  time: string;
  people: number;
}

export interface DigestStats {
  /** The Hong Kong day this digest covers, "YYYY-MM-DD". */
  day: string;
  today: {
    groups: number;
    people: number;
    revenueCents: number;
    /** People in checkouts opened today that never cleared Stripe. */
    pendingPeople: number;
    /** People per ticket type, paid only. */
    byTicketType: { label: string; people: number }[];
    /** Which start times today's bookings were for, busiest first. */
    slots: BookedSlot[];
    /**
     * Checkouts that broke in front of a guest today — a card form that
     * never loaded, a payment refused, one that came back unfinished. The
     * number that was invisible until something like this counted it.
     */
    checkoutProblems: number;
  };
  season: {
    groups: number;
    people: number;
    revenueCents: number;
    /** Every place on sale across the season. */
    capacity: number;
  };
}

/**
 * Which Hong Kong day a digest running now should report on.
 *
 * Two hours back, so the nightly run (00:00 HK) reports the day that just
 * ended in full rather than a day that is four minutes old — and a manual run
 * at any normal hour still reports the day you're standing in.
 */
export function digestDayFor(now: Date = new Date()): string {
  return todayInHongKong(new Date(now.getTime() - 2 * 60 * 60_000));
}

function hongKongDayOf(timestamp: string): string {
  return todayInHongKong(new Date(timestamp));
}

export function summarizeDay({
  day,
  bookings,
  waves,
  events = [],
}: {
  day: string;
  bookings: DigestBookingRow[];
  waves: DigestWaveRow[];
  events?: DigestEventRow[];
}): DigestStats {
  const waveById = new Map(waves.map((w) => [w.id, w]));
  const inSeason = (waveId: string) => {
    const wave = waveById.get(waveId);
    return wave !== undefined && wave.date >= BOOKABLE_WINDOW_START && wave.date <= BOOKABLE_WINDOW_END;
  };

  const madeToday = bookings.filter((b) => hongKongDayOf(b.created_at) === day);
  const paidToday = madeToday.filter((b) => b.status === "paid");

  const peopleByType = new Map<TicketType, number>();
  for (const booking of paidToday) {
    peopleByType.set(booking.ticket_type, (peopleByType.get(booking.ticket_type) ?? 0) + booking.headcount);
  }

  const peopleBySlot = new Map<string, BookedSlot>();
  for (const booking of paidToday) {
    const wave = waveById.get(booking.wave_id);
    if (!wave) continue;
    const key = `${wave.date} ${wave.start_time}`;
    const slot = peopleBySlot.get(key) ?? { date: wave.date, time: wave.start_time.slice(0, 5), people: 0 };
    slot.people += booking.headcount;
    peopleBySlot.set(key, slot);
  }

  // The season figures count only what's on sale now: bookings stranded on
  // dates outside the window (see 019) aren't business anyone can still have.
  const seasonPaid = bookings.filter((b) => b.status === "paid" && inSeason(b.wave_id));

  return {
    day,
    today: {
      groups: paidToday.length,
      people: paidToday.reduce((sum, b) => sum + b.headcount, 0),
      revenueCents: paidToday.reduce((sum, b) => sum + b.amount_paid_cents, 0),
      pendingPeople: madeToday
        .filter((b) => b.status === "pending")
        .reduce((sum, b) => sum + b.headcount, 0),
      byTicketType: [...peopleByType.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([type, people]) => ({ label: TICKET_TYPE_LABELS[type], people })),
      checkoutProblems: events.filter(
        (e) => hongKongDayOf(e.created_at) === day && CHECKOUT_FAILURE_TYPES.includes(e.type as CheckoutEventType)
      ).length,
      slots: [...peopleBySlot.values()].sort(
        (a, b) => b.people - a.people || a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
      ),
    },
    season: {
      groups: seasonPaid.length,
      people: seasonPaid.reduce((sum, b) => sum + b.headcount, 0),
      revenueCents: seasonPaid.reduce((sum, b) => sum + b.amount_paid_cents, 0),
      capacity: waves
        .filter((w) => w.date >= BOOKABLE_WINDOW_START && w.date <= BOOKABLE_WINDOW_END)
        .reduce((sum, w) => sum + w.people_capacity, 0),
    },
  };
}
