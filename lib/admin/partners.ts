// FILE: lib/admin/partners.ts
// -----------------------------------------------------------------------------
// Staff-side reads for the admin Partners page: the partner list, one
// partner's detail, and the date-filterable commission report. Commission is
// never stored — always sales × rate, computed here at report time, so a
// rate change recalculates cleanly. Only PAID bookings/participations count
// (refunds/cancellations never earn commission), per the brief.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeCommissionOwedCents } from "@/lib/partners/validation";

export interface AdminPartner {
  id: string;
  refCode: string;
  name: string;
  commissionRate: number;
  active: boolean;
  createdAt: string;
}

function toAdminPartner(row: {
  id: string;
  ref_code: string;
  name: string;
  commission_rate: number;
  active: boolean;
  created_at: string;
}): AdminPartner {
  return {
    id: row.id,
    refCode: row.ref_code,
    name: row.name,
    commissionRate: row.commission_rate,
    active: row.active,
    createdAt: row.created_at,
  };
}

export async function listPartners(): Promise<AdminPartner[]> {
  const { data, error } = await supabaseAdmin.from("partners").select("*").order("created_at", { ascending: true });
  if (error || !data) {
    console.error("listPartners: query failed:", error?.message);
    return [];
  }
  return data.map(toAdminPartner);
}

export async function fetchPartnerByRefCode(refCode: string): Promise<AdminPartner | null> {
  const { data, error } = await supabaseAdmin.from("partners").select("*").eq("ref_code", refCode).maybeSingle();
  if (error || !data) return null;
  return toAdminPartner(data);
}

export interface PartnerReportRow {
  refCode: string;
  name: string;
  active: boolean;
  commissionRate: number;
  clicks: number;
  bookings: number;
  players: number;
  salesCents: number;
  commissionOwedCents: number;
}

export interface ReportDateRange {
  /** Inclusive, "YYYY-MM-DD". Omit either bound for an open range. */
  from?: string;
  to?: string;
}

export async function fetchPartnerReport(range: ReportDateRange): Promise<PartnerReportRow[]> {
  const partners = await listPartners();
  if (partners.length === 0) return [];

  const clickCounts = await countClicksByRefCode(range);
  const { bookingsByRef, sessionsByRef } = await revenueByRefCode(range);

  return partners.map((partner) => {
    const bookingAgg = bookingsByRef.get(partner.refCode) ?? { count: 0, players: 0, cents: 0 };
    const sessionAgg = sessionsByRef.get(partner.refCode) ?? { count: 0, players: 0, cents: 0 };
    const salesCents = bookingAgg.cents + sessionAgg.cents;

    return {
      refCode: partner.refCode,
      name: partner.name,
      active: partner.active,
      commissionRate: partner.commissionRate,
      clicks: clickCounts.get(partner.refCode) ?? 0,
      bookings: bookingAgg.count + sessionAgg.count,
      players: bookingAgg.players + sessionAgg.players,
      salesCents,
      commissionOwedCents: computeCommissionOwedCents(salesCents, partner.commissionRate),
    };
  });
}

async function countClicksByRefCode(range: ReportDateRange): Promise<Map<string, number>> {
  let query = supabaseAdmin.from("partner_clicks").select("ref_code");
  if (range.from) query = query.gte("clicked_at", range.from);
  if (range.to) query = query.lte("clicked_at", `${range.to}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) {
    console.error("countClicksByRefCode: query failed:", error.message);
    return new Map();
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.ref_code, (counts.get(row.ref_code) ?? 0) + 1);
  }
  return counts;
}

interface RevenueAgg {
  count: number;
  players: number;
  cents: number;
}

async function revenueByRefCode(
  range: ReportDateRange
): Promise<{ bookingsByRef: Map<string, RevenueAgg>; sessionsByRef: Map<string, RevenueAgg> }> {
  let bookingsQuery = supabaseAdmin
    .from("bookings")
    .select("referred_by, headcount, amount_paid_cents")
    .eq("status", "paid")
    .not("referred_by", "is", null);
  if (range.from) bookingsQuery = bookingsQuery.gte("created_at", range.from);
  if (range.to) bookingsQuery = bookingsQuery.lte("created_at", `${range.to}T23:59:59.999Z`);

  let sessionsQuery = supabaseAdmin
    .from("session_participants")
    .select("referred_by, amount_paid_cents")
    .eq("status", "paid")
    .eq("is_host", true)
    .not("referred_by", "is", null);
  if (range.from) sessionsQuery = sessionsQuery.gte("created_at", range.from);
  if (range.to) sessionsQuery = sessionsQuery.lte("created_at", `${range.to}T23:59:59.999Z`);

  const [{ data: bookingRows, error: bookingsError }, { data: sessionRows, error: sessionsError }] =
    await Promise.all([bookingsQuery, sessionsQuery]);

  if (bookingsError) console.error("revenueByRefCode: bookings query failed:", bookingsError.message);
  if (sessionsError) console.error("revenueByRefCode: session_participants query failed:", sessionsError.message);

  const bookingsByRef = new Map<string, RevenueAgg>();
  for (const row of bookingRows ?? []) {
    const key = row.referred_by as string;
    const existing = bookingsByRef.get(key) ?? { count: 0, players: 0, cents: 0 };
    existing.count += 1;
    existing.players += row.headcount;
    existing.cents += row.amount_paid_cents;
    bookingsByRef.set(key, existing);
  }

  const sessionsByRef = new Map<string, RevenueAgg>();
  for (const row of sessionRows ?? []) {
    const key = row.referred_by as string;
    const existing = sessionsByRef.get(key) ?? { count: 0, players: 0, cents: 0 };
    existing.count += 1;
    existing.players += 1; // one host = one player credited
    existing.cents += row.amount_paid_cents;
    sessionsByRef.set(key, existing);
  }

  return { bookingsByRef, sessionsByRef };
}
