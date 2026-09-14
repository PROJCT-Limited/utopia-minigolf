// FILE: lib/admin/dayLoad.ts
// -----------------------------------------------------------------------------
// Pure shaping for the admin calendar and the start-time list's filters. No
// Supabase import on purpose — the admin panel's two views are both just
// arrangements of the same listWavesForAdmin() rows, and arranging them is
// worth testing without a database (see dayLoad.test.ts).
//
// The figures here are PAID bookings. Pending rows are abandoned Stripe
// checkouts far more often than they're imminent sales, so they never colour
// a day or count toward its load; they're carried separately so a day that
// has them can say so.
// -----------------------------------------------------------------------------

import type { AdminWaveListItem } from "./waves";

export interface DayLoad {
  date: string;
  /** Start times that exist on this day, listed or not. */
  startTimeCount: number;
  /** …of which have at least one paid booking. */
  bookedStartTimeCount: number;
  peopleCapacity: number;
  peopleBooked: number;
  groupsBooked: number;
  /** People sitting in unpaid checkouts. Never counted as booked. */
  pendingPeople: number;
  /** Unlisted start times on this day — bookable by private link only. */
  hiddenCount: number;
}

export function summarizeDayLoad(waves: AdminWaveListItem[]): Map<string, DayLoad> {
  const byDate = new Map<string, DayLoad>();

  for (const wave of waves) {
    const day = byDate.get(wave.date) ?? {
      date: wave.date,
      startTimeCount: 0,
      bookedStartTimeCount: 0,
      peopleCapacity: 0,
      peopleBooked: 0,
      groupsBooked: 0,
      pendingPeople: 0,
      hiddenCount: 0,
    };

    day.startTimeCount += 1;
    if (wave.paidBookingCount > 0) day.bookedStartTimeCount += 1;
    day.peopleCapacity += wave.peopleCapacity;
    day.peopleBooked += wave.paidPeopleCount;
    day.groupsBooked += wave.paidBookingCount;
    day.pendingPeople += wave.pendingPeopleCount;
    if (wave.isHidden) day.hiddenCount += 1;

    byDate.set(wave.date, day);
  }

  return byDate;
}

/**
 * Five steps of shading, worked out against the busiest day on the board
 * rather than against capacity.
 *
 * Capacity is the obvious denominator and the wrong one: a day holds ~360
 * people across its 24 start times, so a real early-season evening of 12
 * guests is 3% of capacity and would render as the same blank cell as a day
 * with nobody in it. Scaling to the busiest day instead keeps the calendar
 * answering the question staff actually have — which days are carrying the
 * business — at every stage from the first booking to a sold-out season. The
 * cells still print their absolute numbers, so the shading is a ranking cue
 * and never the only thing on offer.
 */
export type LoadLevel = 0 | 1 | 2 | 3 | 4;

export function loadLevel(peopleBooked: number, busiestDayPeople: number): LoadLevel {
  if (peopleBooked <= 0 || busiestDayPeople <= 0) return 0;

  const share = peopleBooked / busiestDayPeople;
  if (share >= 0.75) return 4;
  if (share >= 0.5) return 3;
  if (share >= 0.25) return 2;
  return 1;
}

export function busiestDayPeople(days: Iterable<DayLoad>): number {
  let max = 0;
  for (const day of days) max = Math.max(max, day.peopleBooked);
  return max;
}

// -----------------------------------------------------------------------------
// The start-time list's filter. "Booked" is the one staff live in — the point
// of the filter is that an evening with two real groups shouldn't have to be
// picked out of 24 identical empty rows.
// -----------------------------------------------------------------------------

export const WAVE_FILTERS = ["all", "booked", "free", "hidden"] as const;
export type WaveFilter = (typeof WAVE_FILTERS)[number];

export const WAVE_FILTER_LABELS: Record<WaveFilter, string> = {
  all: "All",
  booked: "Booked",
  free: "Free",
  hidden: "Unlisted",
};

export function isWaveFilter(value: string | undefined): value is WaveFilter {
  return value !== undefined && (WAVE_FILTERS as readonly string[]).includes(value);
}

export function filterWaves(waves: AdminWaveListItem[], filter: WaveFilter): AdminWaveListItem[] {
  switch (filter) {
    case "booked":
      // Anything a guest is attached to, paid or mid-checkout: a pending row
      // still means somebody is looking at this start time right now.
      return waves.filter((w) => w.paidBookingCount > 0 || w.pendingBookingCount > 0);
    case "free":
      return waves.filter((w) => w.paidBookingCount === 0 && w.pendingBookingCount === 0);
    case "hidden":
      return waves.filter((w) => w.isHidden);
    case "all":
      return waves;
  }
}

/** Day-by-day, in date order — the shape both admin views render from. */
export function groupWavesByDate(waves: AdminWaveListItem[]): { date: string; waves: AdminWaveListItem[] }[] {
  const byDate = new Map<string, AdminWaveListItem[]>();
  for (const wave of waves) {
    const bucket = byDate.get(wave.date);
    if (bucket) bucket.push(wave);
    else byDate.set(wave.date, [wave]);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, waves]) => ({
      date,
      waves: [...waves].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));
}
