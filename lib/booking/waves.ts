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

const LOW_AVAILABILITY_THRESHOLD = 4;
export const PROVISIONAL_LABEL = "Opening soon — reserve your place";

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
