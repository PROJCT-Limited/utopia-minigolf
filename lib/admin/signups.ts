// FILE: lib/admin/signups.ts
// -----------------------------------------------------------------------------
// Staff-side read for the admin Sign-ups page and its CSV export: everyone who
// has given us their details, from either door — the "Get launch updates" form
// (`subscribers`) or a paid booking (`bookings`, online or walk-in). Pending
// checkouts never paid and cancelled bookings were refunded, so neither counts.
//
// The columns are a list, not markup: the page and the CSV both render
// SIGNUP_COLUMNS, so adding a column is one entry here (plus the field on
// Signup it reads) and shows up in both places at once.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import { todayInHongKong } from "@/lib/scoring/activeWindow";
import { VENUE_TIME_ZONE } from "@/lib/booking/pricing";

export const SIGNUP_SOURCES = ["launch_updates", "booking", "walk_in"] as const;
export type SignupSource = (typeof SIGNUP_SOURCES)[number];

export const SIGNUP_SOURCE_LABELS: Record<SignupSource, string> = {
  launch_updates: "Launch updates",
  booking: "Booking",
  walk_in: "Walk-in",
};

export interface Signup {
  /** Unique across sources — the table key, not a database id. */
  key: string;
  source: SignupSource;
  name: string | null;
  /** Walk-ins can be booked at the door without one. */
  email: string | null;
  /** ISO timestamp: when they subscribed, or when the booking was made. */
  signedUpAt: string;
  /** Players on the booking; null for launch-update sign-ups. */
  partySize: number | null;
}

export interface SignupColumn {
  id: string;
  label: string;
  /** What the admin table shows. */
  display: (row: Signup) => string;
  /** What the CSV gets, when a spreadsheet wants something plainer. */
  csv?: (row: Signup) => string;
}

export const SIGNUP_COLUMNS: SignupColumn[] = [
  { id: "name", label: "Name", display: (r) => r.name ?? "" },
  { id: "email", label: "Email", display: (r) => r.email ?? "" },
  { id: "source", label: "Source", display: (r) => SIGNUP_SOURCE_LABELS[r.source] },
  {
    id: "signedUpAt",
    label: "Signed up (HKT)",
    display: (r) => formatHongKongDateTime(r.signedUpAt),
    csv: (r) => hongKongSortableDateTime(r.signedUpAt),
  },
  { id: "partySize", label: "Party size", display: (r) => (r.partySize === null ? "" : String(r.partySize)) },
];

export const SIGNUP_FILTERS = ["all", "today"] as const;
export type SignupFilter = (typeof SIGNUP_FILTERS)[number];

export const SIGNUP_FILTER_LABELS: Record<SignupFilter, string> = {
  all: "All",
  today: "Today",
};

export function isSignupFilter(value: string | undefined): value is SignupFilter {
  return SIGNUP_FILTERS.includes(value as SignupFilter);
}

/** "Today" is the Hong Kong day, whatever clock the server runs on. */
export function filterSignups(rows: Signup[], filter: SignupFilter, now: Date = new Date()): Signup[] {
  if (filter === "all") return rows;
  const today = todayInHongKong(now);
  return rows.filter((r) => todayInHongKong(new Date(r.signedUpAt)) === today);
}

/** Every sign-up from both sources, newest first. */
export async function fetchSignups(): Promise<Signup[]> {
  const [subscribers, bookings] = await Promise.all([
    fetchAll<{ id: string; name: string | null; email: string; created_at: string }>(
      "subscribers",
      "id, name, email, created_at"
    ),
    fetchAll<{
      id: string;
      lead_name: string | null;
      lead_email: string | null;
      headcount: number;
      source: "online" | "walk_in";
      created_at: string;
    }>("bookings", "id, lead_name, lead_email, headcount, source, created_at", { column: "status", equals: "paid" }),
  ]);

  const rows: Signup[] = [
    ...subscribers.map((s) => ({
      key: `subscriber-${s.id}`,
      source: "launch_updates" as const,
      name: s.name,
      email: s.email,
      signedUpAt: s.created_at,
      partySize: null,
    })),
    ...bookings.map((b) => ({
      key: `booking-${b.id}`,
      source: b.source === "walk_in" ? ("walk_in" as const) : ("booking" as const),
      name: b.lead_name,
      email: b.lead_email,
      signedUpAt: b.created_at,
      partySize: b.headcount,
    })),
  ];

  return rows.sort((a, b) => Date.parse(b.signedUpAt) - Date.parse(a.signedUpAt));
}

// Supabase caps a read at 1000 rows, so page explicitly rather than let a
// growing list quietly lose its oldest sign-ups.
async function fetchAll<T>(
  table: string,
  columns: string,
  where?: { column: string; equals: string }
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    let query = supabaseAdmin.from(table).select(columns);
    if (where) query = query.eq(where.column, where.equals);
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: true }) // tie-break, so no row slips between pages
      .range(from, from + pageSize - 1);

    if (error) {
      console.error(`fetchSignups: ${table} query failed:`, error.message);
      break;
    }
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

/** "4 Nov 2026, 20:41" in Hong Kong time. */
function formatHongKongDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: VENUE_TIME_ZONE,
  });
}

/** "2026-11-04 20:41" in Hong Kong time — sorts and parses cleanly in a spreadsheet. */
function hongKongSortableDateTime(iso: string): string {
  const hk = new Date(Date.parse(iso) + 8 * 60 * 60_000).toISOString();
  return `${hk.slice(0, 10)} ${hk.slice(11, 16)}`;
}
