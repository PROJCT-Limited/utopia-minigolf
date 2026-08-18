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
  capacity: number;
  booked: number;
  status: "provisional" | "confirmed" | "full";
}

export interface WaveView {
  id: string;
  date: string;
  startTime: string;
  status: WaveRow["status"];
  capacity: number;
  booked: number;
  spotsLeft: number;
  isFull: boolean;
  isLowAvailability: boolean;
  /** What the booking UI shows in place of a real time for provisional waves. */
  timeLabel: string;
}

const LOW_AVAILABILITY_THRESHOLD = 2;
export const PROVISIONAL_LABEL = "Opening soon — reserve your place";

/** First date the club is open — nothing earlier can be booked, blind or otherwise. */
export const BOOKING_OPENS_ON = "2026-09-24";

export function toWaveView(row: WaveRow): WaveView {
  const spotsLeft = Math.max(0, row.capacity - row.booked);
  const isFull = row.status === "full" || spotsLeft === 0;

  return {
    id: row.id,
    date: row.date,
    startTime: row.start_time,
    status: row.status,
    capacity: row.capacity,
    booked: row.booked,
    spotsLeft,
    isFull,
    isLowAvailability: !isFull && spotsLeft <= LOW_AVAILABILITY_THRESHOLD,
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
// Month-calendar view: a day-level "how busy is this day" summary (for the
// heatmap grid) plus the pure date-grid math to lay out a calendar month.
// -----------------------------------------------------------------------------

export interface DaySummary {
  date: string;
  waveCount: number;
  spotsLeft: number;
  capacity: number;
}

export function summarizeWavesByDay(waves: WaveView[]): Map<string, DaySummary> {
  const byDate = new Map<string, DaySummary>();
  for (const w of waves) {
    const existing = byDate.get(w.date) ?? { date: w.date, waveCount: 0, spotsLeft: 0, capacity: 0 };
    existing.waveCount += 1;
    existing.spotsLeft += w.spotsLeft;
    existing.capacity += w.capacity;
    byDate.set(w.date, existing);
  }
  return byDate;
}

export type DayBusyness = "none" | "quiet" | "busy" | "full";

const BUSY_SPOTS_LEFT_RATIO = 0.3;

/** How full a day is, at a glance — for the month calendar's heatmap dots. */
export function busynessForDay(summary: DaySummary | undefined): DayBusyness {
  if (!summary || summary.waveCount === 0) return "none";
  if (summary.spotsLeft === 0) return "full";
  return summary.spotsLeft / summary.capacity <= BUSY_SPOTS_LEFT_RATIO ? "busy" : "quiet";
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
