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
  total_wave_slots: number;
  wave_slots_used: number;
  status: "provisional" | "confirmed" | "full";
}

export interface WaveView {
  id: string;
  date: string;
  startTime: string;
  status: WaveRow["status"];
  totalWaveSlots: number;
  waveSlotsUsed: number;
  slotsLeft: number;
  isFull: boolean;
  isLowAvailability: boolean;
  /** What the booking UI shows in place of a real time for provisional waves. */
  timeLabel: string;
}

const LOW_AVAILABILITY_THRESHOLD = 1;
export const PROVISIONAL_LABEL = "Opening soon — reserve your place";

/** The only bookable date range — nothing outside it is fetched or shown. */
export const BOOKABLE_WINDOW_START = "2026-09-30";
export const BOOKABLE_WINDOW_END = "2026-10-31";

export function toWaveView(row: WaveRow): WaveView {
  const slotsLeft = Math.max(0, row.total_wave_slots - row.wave_slots_used);
  const isFull = row.status === "full" || slotsLeft === 0;

  return {
    id: row.id,
    date: row.date,
    startTime: row.start_time,
    status: row.status,
    totalWaveSlots: row.total_wave_slots,
    waveSlotsUsed: row.wave_slots_used,
    slotsLeft,
    isFull,
    isLowAvailability: !isFull && slotsLeft <= LOW_AVAILABILITY_THRESHOLD,
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
// :15, :30, :45), each its own row in `waves` with its own small capacity (3
// or 2 groups). The picker shows the containing HOUR first, aggregated
// across its 4 quarter-hour start times, and expands to the individual start
// times on demand — this groups a day's (or week's) waves by hour for that
// first level.
// -----------------------------------------------------------------------------

export interface HourGroup {
  key: string; // `${date}-${hour}`, e.g. "2026-09-30-16:00"
  date: string;
  hour: string; // "16:00"
  waves: WaveView[]; // the quarter-hour start times within this hour, sorted
  slotsLeft: number;
  totalWaveSlots: number;
  isFull: boolean;
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
      slotsLeft: groupWaves.reduce((sum, w) => sum + (w.isFull ? 0 : w.slotsLeft), 0),
      totalWaveSlots: groupWaves.reduce((sum, w) => sum + w.totalWaveSlots, 0),
      isFull: groupWaves.every((w) => w.isFull),
    }));
}

// -----------------------------------------------------------------------------
// Month-calendar view: a day-level "how busy is this day" summary (for the
// heatmap grid) plus the pure date-grid math to lay out a calendar month.
// -----------------------------------------------------------------------------

export interface DaySummary {
  date: string;
  waveCount: number;
  slotsLeft: number;
  totalWaveSlots: number;
}

export function summarizeWavesByDay(waves: WaveView[]): Map<string, DaySummary> {
  const byDate = new Map<string, DaySummary>();
  for (const w of waves) {
    const existing = byDate.get(w.date) ?? { date: w.date, waveCount: 0, slotsLeft: 0, totalWaveSlots: 0 };
    existing.waveCount += 1;
    existing.slotsLeft += w.slotsLeft;
    existing.totalWaveSlots += w.totalWaveSlots;
    byDate.set(w.date, existing);
  }
  return byDate;
}

export type DayBusyness = "none" | "quiet" | "busy" | "full";

const BUSY_SLOTS_LEFT_RATIO = 0.3;

/** How full a day is, at a glance — for the month calendar's heatmap dots. */
export function busynessForDay(summary: DaySummary | undefined): DayBusyness {
  if (!summary || summary.waveCount === 0) return "none";
  if (summary.slotsLeft === 0) return "full";
  return summary.slotsLeft / summary.totalWaveSlots <= BUSY_SLOTS_LEFT_RATIO ? "busy" : "quiet";
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
