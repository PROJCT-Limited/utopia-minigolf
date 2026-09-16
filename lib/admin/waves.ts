// FILE: lib/admin/waves.ts
// -----------------------------------------------------------------------------
// Staff-side reads for the admin panel: wave list with booking counts, and a
// single wave's full detail including its bookings and (staff-only) pairing
// profiles. Only ever called from routes proxy.ts has already gated.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import { toWaveView, type WaveRow, type WaveView } from "@/lib/booking/waves";
import type { TicketType } from "@/lib/booking/pricing";
import {
  CHECKOUT_EVENT_LABELS,
  CHECKOUT_FAILURE_TYPES,
  type CheckoutEventType,
} from "@/lib/booking/checkoutEvents";

// Staff see every start time, listed or not, and need the private link's
// token to hand out — the public column set (wavesRepo.ts) carries neither.
const ADMIN_WAVE_COLUMNS =
  "id, date, start_time, people_capacity, people_used, wave_slots_used, status, visibility, private_token";

type AdminWaveRow = WaveRow & { private_token: string | null };

export interface AdminWaveListItem extends WaveView {
  /** Groups (paid bookings) at this start time, counted from `bookings`. */
  paidBookingCount: number;
  /** People across those groups — the figure the 15-per-start-time cap is on. */
  paidPeopleCount: number;
  /**
   * Checkouts that never cleared Stripe. They hold no capacity and are never
   * counted as business, but the list marks a start time that has them: it's
   * the difference between "nobody wanted this evening" and "somebody tried".
   */
  pendingBookingCount: number;
  pendingPeopleCount: number;
  /** The private link's token, on unlisted start times only. */
  privateToken: string | null;
  /**
   * True when the `people_used` counter that actually gates booking disagrees
   * with the paid bookings behind it. Should never happen; surfaced rather
   * than hidden because a stuck counter silently blocks (or oversells) a
   * start time, and the counter — not this table's sum — is what customers hit.
   */
  capacityCounterDrift: boolean;
}

export async function listWavesForAdmin(): Promise<AdminWaveListItem[]> {
  const { data: waveRows, error } = await supabaseAdmin
    .from("waves")
    .select(ADMIN_WAVE_COLUMNS)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error || !waveRows) {
    console.error("listWavesForAdmin: waves query failed:", error?.message);
    return [];
  }

  // Paid and pending in one read, split below — two round trips to count two
  // statuses of the same table isn't worth the tidiness.
  const { data: bookingRows, error: bookingsError } = await supabaseAdmin
    .from("bookings")
    .select("wave_id, headcount, status")
    .in("status", ["paid", "pending"]);

  if (bookingsError) {
    console.error("listWavesForAdmin: bookings query failed:", bookingsError.message);
  }

  const byWave = new Map<string, WaveTally>();
  for (const row of bookingRows ?? []) {
    const tally = byWave.get(row.wave_id) ?? emptyTally();
    if (row.status === "pending") {
      tally.pendingGroups += 1;
      tally.pendingPeople += row.headcount;
      byWave.set(row.wave_id, tally);
      continue;
    }
    tally.groups += 1;
    tally.people += row.headcount;
    byWave.set(row.wave_id, tally);
  }

  return (waveRows as AdminWaveRow[]).map((row) => {
    const view = toWaveView(row);
    const tally = byWave.get(row.id) ?? emptyTally();
    return {
      ...view,
      paidBookingCount: tally.groups,
      paidPeopleCount: tally.people,
      pendingBookingCount: tally.pendingGroups,
      pendingPeopleCount: tally.pendingPeople,
      privateToken: row.private_token ?? null,
      capacityCounterDrift: !bookingsError && tally.people !== view.peopleUsed,
    };
  });
}

interface WaveTally {
  groups: number;
  people: number;
  pendingGroups: number;
  pendingPeople: number;
}

function emptyTally(): WaveTally {
  return { groups: 0, people: 0, pendingGroups: 0, pendingPeople: 0 };
}

export interface AdminBookingRow {
  id: string;
  /**
   * Checkout failures recorded against this booking (see
   * migrations/022_checkout_events.sql) — newest first. A pending row with
   * these attached is a guest who tried and couldn't, not one who wandered
   * off, and that's the difference between chasing them and leaving them be.
   */
  checkoutProblems: { label: string; detail: string | null; at: string }[];
  leadName: string;
  leadEmail: string;
  partyType: "solo" | "pair" | "group";
  headcount: number;
  ticketType: TicketType;
  status: "pending" | "paid" | "cancelled";
  amountPaidCents: number;
  currency: string;
}

export interface AdminWaveDetail {
  wave: WaveView;
  /** Set only while the start time is unlisted. */
  privateToken: string | null;
  bookings: AdminBookingRow[];
  /** Groups and people from the paid bookings below — see AdminWaveListItem. */
  paidBookingCount: number;
  paidPeopleCount: number;
}

export async function fetchWaveAdminDetail(waveId: string): Promise<AdminWaveDetail | null> {
  const { data: waveRow, error: waveError } = await supabaseAdmin
    .from("waves")
    .select(ADMIN_WAVE_COLUMNS)
    .eq("id", waveId)
    .maybeSingle();

  if (waveError || !waveRow) return null;

  const { data: bookingRows, error: bookingsError } = await supabaseAdmin
    .from("bookings")
    .select("id, lead_name, lead_email, party_type, headcount, ticket_type, status, amount_paid_cents, currency")
    .eq("wave_id", waveId)
    .order("created_at", { ascending: true });

  if (bookingsError) {
    console.error("fetchWaveAdminDetail: bookings query failed:", bookingsError.message);
  }

  const { data: eventRows } = await supabaseAdmin
    .from("checkout_events")
    .select("booking_id, type, detail, created_at")
    .in("booking_id", (bookingRows ?? []).map((b) => b.id).length ? (bookingRows ?? []).map((b) => b.id) : ["none"])
    .in("type", CHECKOUT_FAILURE_TYPES)
    .order("created_at", { ascending: false });

  const problemsByBooking = new Map<string, AdminBookingRow["checkoutProblems"]>();
  for (const row of eventRows ?? []) {
    if (!row.booking_id) continue;
    const list = problemsByBooking.get(row.booking_id) ?? [];
    list.push({
      label: CHECKOUT_EVENT_LABELS[row.type as CheckoutEventType] ?? row.type,
      detail: row.detail,
      at: row.created_at,
    });
    problemsByBooking.set(row.booking_id, list);
  }

  const bookings: AdminBookingRow[] = (bookingRows ?? []).map((b) => ({
    id: b.id,
    checkoutProblems: problemsByBooking.get(b.id) ?? [],
    leadName: b.lead_name,
    leadEmail: b.lead_email,
    partyType: b.party_type,
    headcount: b.headcount,
    ticketType: b.ticket_type,
    status: b.status,
    amountPaidCents: b.amount_paid_cents,
    currency: b.currency,
  }));

  const paid = bookings.filter((b) => b.status === "paid");

  return {
    wave: toWaveView(waveRow as AdminWaveRow),
    privateToken: (waveRow as AdminWaveRow).private_token ?? null,
    bookings,
    paidBookingCount: paid.length,
    paidPeopleCount: paid.reduce((sum, b) => sum + b.headcount, 0),
  };
}
