// FILE: lib/booking/waves.ts
// -----------------------------------------------------------------------------
// Pure wave view/grouping logic the booking wizard's weekly-grid and
// monthly-calendar toggle both read from — no Supabase import here on
// purpose, so these are testable without a database or env vars (see
// waves.test.ts) and safe to import from client components for types.
// DB access lives in wavesRepo.ts.
// -----------------------------------------------------------------------------

export interface WaveRow {
  id: string;
  date: string; // "YYYY-MM-DD"
  start_time: string; // "HH:MM:SS"
  people_capacity: number;
  people_used: number;
  /** Groups booked at this start time — a display figure, never a limit. */
  wave_slots_used: number;
  status: "provisional" | "confirmed" | "full";
}

export interface WaveView {
  id: string;
  date: string;
  startTime: string;
  status: WaveRow["status"];
  /** How many people this start time holds in total. */
  peopleCapacity: number;
  peopleUsed: number;
  peopleLeft: number;
  /** How many groups are booked here. Capacity is people, so this is
      reporting only — the admin panel shows it beside the people figure. */
  groupsBooked: number;
  isFull: boolean;
  isLowAvailability: boolean;
  /** What the booking UI shows in place of a real time for provisional waves. */
  timeLabel: string;
}

/**
 * Capacity is counted in people, so whether a start time is bookable depends
 * on who's asking: 3 spaces left is wide open to a pair and closed to a
 * four. Everything customer-facing that shows or gates availability goes
 * through this, so nobody is offered a start time their group won't fit in.
 */
export function hasRoomFor(wave: Pick<WaveView, "peopleLeft" | "isFull">, headcount: number): boolean {
  return !wave.isFull && wave.peopleLeft >= headcount;
}

// A start time with fewer than a full group's worth of space left is nearly
// gone — that's the point where a walk-up group of five can no longer take it.
const LOW_AVAILABILITY_PEOPLE = 5;
export const PROVISIONAL_LABEL = "Opening soon — reserve your place";

/** The only bookable date range — nothing outside it is fetched or shown. */
export const BOOKABLE_WINDOW_START = "2026-10-08";
export const BOOKABLE_WINDOW_END = "2026-11-11";

export function toWaveView(row: WaveRow): WaveView {
  const peopleLeft = Math.max(0, row.people_capacity - row.people_used);
  const isFull = row.status === "full" || peopleLeft === 0;

  return {
    id: row.id,
    date: row.date,
    startTime: row.start_time,
    status: row.status,
    peopleCapacity: row.people_capacity,
    peopleUsed: row.people_used,
    peopleLeft,
    groupsBooked: row.wave_slots_used,
    isFull,
    isLowAvailability: !isFull && peopleLeft < LOW_AVAILABILITY_PEOPLE,
    timeLabel: row.status === "provisional" ? PROVISIONAL_LABEL : formatTime(row.start_time),
  };
}

function formatTime(startTime: string): string {
  const [hours, minutes] = startTime.split(":");
  return `${hours}:${minutes}`;
}

/** Monday-start ISO week key, e.g. "2026-09-07", for grouping into a weekly grid. */
function weekStartKey(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

export interface WaveGroup {
  key: string;
  waves: WaveView[];
}

export function groupByWeek(waves: WaveView[]): WaveGroup[] {
  return groupBy(waves, (w) => weekStartKey(w.date));
}

export function groupByMonth(waves: WaveView[]): WaveGroup[] {
  return groupBy(waves, (w) => monthKey(w.date));
}

function groupBy(waves: WaveView[], keyFn: (w: WaveView) => string): WaveGroup[] {
  const sorted = [...waves].sort((a, b) =>
    a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)
  );

  const groups = new Map<string, WaveView[]>();
  for (const wave of sorted) {
    const key = keyFn(wave);
    const bucket = groups.get(key);
    if (bucket) bucket.push(wave);
    else groups.set(key, [wave]);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, waves]) => ({ key, waves }));
}

// -----------------------------------------------------------------------------
// Two-level picker: bookable start times fall on quarter-hour marks (:00,
// :15, :30, :45), each its own row in `waves` with its own people cap. The
// picker shows the containing HOUR first, aggregated across its 4
// quarter-hour start times, and expands to the individual start times on
// demand — this groups a day's (or week's) waves by hour for that first
// level.
// -----------------------------------------------------------------------------

export interface HourGroup {
  key: string; // `${date}-${hour}`, e.g. "2026-10-08-16:00"
  date: string;
  hour: string; // "16:00"
  waves: WaveView[]; // the quarter-hour start times within this hour, sorted
  peopleLeft: number;
  peopleCapacity: number;
  isFull: boolean;
  /** The largest group that still fits in *some* start time in this hour. */
  largestGroupThatFits: number;
}

function hourOf(startTime: string): string {
  return `${startTime.slice(0, 2)}:00`;
}

/** Groups waves (from one or many days) under their containing hour. */
export function groupByHour(waves: WaveView[]): HourGroup[] {
  const sorted = [...waves].sort((a, b) =>
    a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)
  );

  const groups = new Map<string, WaveView[]>();
  for (const wave of sorted) {
    const key = `${wave.date}-${hourOf(wave.startTime)}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(wave);
    else groups.set(key, [wave]);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, groupWaves]) => ({
      key,
      date: groupWaves[0].date,
      hour: hourOf(groupWaves[0].startTime),
      waves: groupWaves,
      peopleLeft: groupWaves.reduce((sum, w) => sum + (w.isFull ? 0 : w.peopleLeft), 0),
      peopleCapacity: groupWaves.reduce((sum, w) => sum + w.peopleCapacity, 0),
      isFull: groupWaves.every((w) => w.isFull),
      // Space doesn't pool across start times: a group books one of them, so
      // what matters is the roomiest single start time, not the hour's total.
      largestGroupThatFits: groupWaves.reduce((max, w) => (w.isFull ? max : Math.max(max, w.peopleLeft)), 0),
    }));
}

// -----------------------------------------------------------------------------
// Month-calendar view: a day-level "how busy is this day" summary (for the
// heatmap grid) plus the pure date-grid math to lay out a calendar month.
// -----------------------------------------------------------------------------

export interface DaySummary {
  date: string;
  startTimeCount: number;
  groupsBooked: number;
  peopleUsed: number;
  peopleLeft: number;
  peopleCapacity: number;
}

export function summarizeWavesByDay(waves: WaveView[]): Map<string, DaySummary> {
  const byDate = new Map<string, DaySummary>();
  for (const w of waves) {
    const existing = byDate.get(w.date) ?? {
      date: w.date,
      startTimeCount: 0,
      groupsBooked: 0,
      peopleUsed: 0,
      peopleLeft: 0,
      peopleCapacity: 0,
    };
    existing.startTimeCount += 1;
    existing.groupsBooked += w.groupsBooked;
    existing.peopleUsed += w.peopleUsed;
    existing.peopleLeft += w.peopleLeft;
    existing.peopleCapacity += w.peopleCapacity;
    byDate.set(w.date, existing);
  }
  return byDate;
}

export type DayBusyness = "none" | "quiet" | "busy" | "full";

const BUSY_PEOPLE_LEFT_RATIO = 0.3;

/** How full a day is, at a glance — for the month calendar's heatmap dots. */
export function busynessForDay(summary: DaySummary | undefined): DayBusyness {
  if (!summary || summary.startTimeCount === 0) return "none";
  if (summary.peopleLeft === 0) return "full";
  return summary.peopleLeft / summary.peopleCapacity <= BUSY_PEOPLE_LEFT_RATIO ? "busy" : "quiet";
}

/**
 * A Monday-start calendar grid for `monthKey` ("YYYY-MM"): one entry per
 * cell, `null` for the leading/trailing padding days outside the month, in
 * whole weeks (length is always a multiple of 7).
 */
export function monthGridDays(monthKey: string): (string | null)[] {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-indexed

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sunday
  const leadingBlanks = (firstWeekday + 6) % 7; // Monday-start offset

  const cells: (string | null)[] = new Array(leadingBlanks).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** The next/previous "YYYY-MM" key relative to `monthKey`. */
export function shiftMonthKey(monthKey: string, delta: number): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const d = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
