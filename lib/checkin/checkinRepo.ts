// FILE: lib/checkin/checkinRepo.ts
// -----------------------------------------------------------------------------
// DB access for the door check-in tablet (app/checkin/): today's arrivals, the
// attendance a human confirmed, and the player rows — name plus the ball tag
// they were handed — that everything downstream reads. The stations stay
// dumb on purpose: they scan a ball and log a stroke, so the ball-to-name
// link written here is what makes a leaderboard row belong to a real person.
//
// Pure logic (tag normalisation, roster maths, which slot a walk-in lands in)
// lives in checkin.ts and is tested there.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  computeBookingTotalCents,
  derivePartyTypeFromHeadcount,
  CURRENCY,
  type TicketType,
} from "@/lib/booking/pricing";
import { generateManageToken } from "@/lib/booking/token";
import { adjustSeats, reserveSeats } from "@/lib/booking/waveCapacity";
import { isCurrentlyActive, todayInHongKong } from "@/lib/scoring/activeWindow";
import { normalizeBallTag, normalizePlayerName, pickWalkInWave } from "./checkin";

export interface CheckInBooking {
  id: string;
  waveId: string;
  /** "HH:MM" at the venue. */
  startTime: string;
  leadName: string;
  ticketType: TicketType;
  /** What was sold, and what capacity was charged for. */
  bookedHeadcount: number;
  /** What the door confirmed actually turned up — null until check-in. */
  presentHeadcount: number | null;
  paymentStatus: "pending" | "paid";
  source: "online" | "walk_in";
  checkedInAt: string | null;
  /** How many of them already have a name and (usually) a ball. */
  registeredCount: number;
}

export interface CheckInPlayer {
  id: string;
  name: string;
  email: string | null;
  ballTagId: string | null;
}

interface BookingRow {
  id: string;
  wave_id: string;
  lead_name: string;
  ticket_type: TicketType;
  headcount: number;
  present_headcount: number | null;
  status: "pending" | "paid" | "cancelled";
  source: "online" | "walk_in";
  checked_in_at: string | null;
}

// -----------------------------------------------------------------------------
// Screen 1 — today's arrivals
// -----------------------------------------------------------------------------

/**
 * Every group expected at the door today, earliest first. Pending bookings
 * are included on purpose: staff need to see an unpaid one *before* the group
 * walks onto the floor, which is the whole reason payment status is on
 * Screen 2. Cancelled bookings are not arrivals and never appear.
 */
export async function fetchTodaysArrivals(): Promise<CheckInBooking[]> {
  const today = todayInHongKong();

  const { data: waves, error: wavesError } = await supabaseAdmin
    .from("waves")
    .select("id, start_time")
    .eq("date", today);
  if (wavesError) {
    console.error("fetchTodaysArrivals: waves query failed:", wavesError.message);
    return [];
  }

  const startTimeByWave = new Map((waves ?? []).map((w) => [w.id, w.start_time as string]));
  if (startTimeByWave.size === 0) return [];

  const { data: bookings, error: bookingsError } = await supabaseAdmin
    .from("bookings")
    .select("id, wave_id, lead_name, ticket_type, headcount, present_headcount, status, source, checked_in_at")
    .in("wave_id", Array.from(startTimeByWave.keys()))
    .neq("status", "cancelled");
  if (bookingsError) {
    console.error("fetchTodaysArrivals: bookings query failed:", bookingsError.message);
    return [];
  }

  const rows = (bookings ?? []) as BookingRow[];
  const registeredCounts = await countPlayersByBooking(rows.map((b) => b.id));

  return rows
    .map((b) => toCheckInBooking(b, startTimeByWave.get(b.wave_id) ?? "00:00:00", registeredCounts.get(b.id) ?? 0))
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.leadName.localeCompare(b.leadName));
}

function toCheckInBooking(row: BookingRow, startTime: string, registeredCount: number): CheckInBooking {
  return {
    id: row.id,
    waveId: row.wave_id,
    startTime: startTime.slice(0, 5),
    leadName: row.lead_name,
    ticketType: row.ticket_type,
    bookedHeadcount: row.headcount,
    presentHeadcount: row.present_headcount,
    paymentStatus: row.status === "paid" ? "paid" : "pending",
    source: row.source,
    checkedInAt: row.checked_in_at,
    registeredCount,
  };
}

async function countPlayersByBooking(bookingIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (bookingIds.length === 0) return counts;

  const { data, error } = await supabaseAdmin
    .from("booking_players")
    .select("booking_id")
    .in("booking_id", bookingIds);
  if (error) {
    console.error("countPlayersByBooking: query failed:", error.message);
    return counts;
  }

  for (const row of data ?? []) {
    const id = (row as { booking_id: string }).booking_id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** One group, refetched — the tablet reloads this after every write so what's
 *  on screen is what's in the database, not what it hoped it wrote. */
export async function fetchGroup(
  bookingId: string
): Promise<{ booking: CheckInBooking; players: CheckInPlayer[] } | null> {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, wave_id, lead_name, ticket_type, headcount, present_headcount, status, source, checked_in_at, waves(start_time)"
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("fetchGroup: query failed:", error.message);
    return null;
  }

  const wave = Array.isArray(data.waves) ? data.waves[0] : data.waves;
  const players = await fetchPlayers(bookingId);
  return {
    booking: toCheckInBooking(data as unknown as BookingRow, wave?.start_time ?? "00:00:00", players.length),
    players,
  };
}

export async function fetchPlayers(bookingId: string): Promise<CheckInPlayer[]> {
  const { data, error } = await supabaseAdmin
    .from("booking_players")
    .select("id, name, email, ball_tag_id")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchPlayers: query failed:", error.message);
    return [];
  }
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    ballTagId: p.ball_tag_id,
  }));
}

// -----------------------------------------------------------------------------
// Screen 2 — attendance
// -----------------------------------------------------------------------------

/**
 * Records how many of the group actually turned up.
 *
 * `headcount` (what was sold) never moves — three of a booked four turning up
 * doesn't refund anyone, and the seats stay held. Only going *above* what was
 * sold takes more of the floor, so that's the one direction that has to fit:
 * five arriving on a booking for four needs a fifth space at that start time,
 * and is refused if the slot is full.
 */
export async function setPresentHeadcount(
  bookingId: string,
  present: number
): Promise<{ ok: boolean; error?: string }> {
  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("id, wave_id, headcount, present_headcount")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) {
    console.error("setPresentHeadcount: booking not found", bookingId, error?.message);
    return { ok: false, error: "Couldn't find that booking." };
  }

  const heldBefore = Math.max(booking.headcount, booking.present_headcount ?? booking.headcount);
  const heldAfter = Math.max(booking.headcount, present);
  const delta = heldAfter - heldBefore;

  if (delta !== 0 && !(await adjustSeats(booking.wave_id, delta))) {
    return {
      ok: false,
      error: "That start time can't take another player — check them in as a separate walk-in at the next slot.",
    };
  }

  const { error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({ present_headcount: present, updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (updateError) {
    console.error("setPresentHeadcount: update failed:", updateError.message);
    if (delta !== 0) await adjustSeats(booking.wave_id, -delta); // put the space back
    return { ok: false, error: "Couldn't save the party size. Try again." };
  }
  return { ok: true };
}

// -----------------------------------------------------------------------------
// Screen 3 — players and their balls
// -----------------------------------------------------------------------------

export interface BallHolder {
  playerId: string;
  playerName: string;
  groupName: string;
  startTime: string;
}

interface BallHolderRow {
  id: string;
  name: string;
  bookings: {
    lead_name: string;
    ticket_type: TicketType;
    waves: { date: string; start_time: string } | { date: string; start_time: string }[] | null;
  } | null;
}

/**
 * Who currently holds this ball, if anyone.
 *
 * This is the same lookup a station tablet makes when it scans a tag mid-
 * round — tag in, player out — and the one check-in makes before handing the
 * ball to someone else.
 */
export async function fetchActiveBallHolder(rawTag: string): Promise<BallHolder | null> {
  const tag = normalizeBallTag(rawTag);
  const { data, error } = await supabaseAdmin
    .from("booking_players")
    .select("id, name, bookings(lead_name, ticket_type, waves(date, start_time))")
    .eq("ball_tag_id", tag)
    .is("ball_released_at", null)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("fetchActiveBallHolder: query failed:", error.message);
    return null;
  }

  const row = data as unknown as BallHolderRow;
  const booking = Array.isArray(row.bookings) ? row.bookings[0] : row.bookings;
  const wave = Array.isArray(booking?.waves) ? booking?.waves[0] : booking?.waves;
  return {
    playerId: row.id,
    playerName: row.name,
    groupName: booking?.lead_name ?? "another group",
    startTime: (wave?.start_time ?? "00:00:00").slice(0, 5),
  };
}

/**
 * Frees a tag whose round is over so the ball can go back out, and reports a
 * genuine clash (someone still on the floor has it) instead.
 *
 * Balls circulate all day — the same tag is handed out again a few slots
 * later — so an old assignment is never a conflict, it's just stale. What
 * staff must not be able to do is link a ball that's currently in play.
 */
async function claimBallTag(rawTag: string, forPlayerId?: string): Promise<{ ok: boolean; error?: string }> {
  const tag = normalizeBallTag(rawTag);

  const { data, error } = await supabaseAdmin
    .from("booking_players")
    .select("id, name, bookings(lead_name, ticket_type, waves(date, start_time))")
    .eq("ball_tag_id", tag)
    .is("ball_released_at", null)
    .maybeSingle();

  if (error) {
    console.error("claimBallTag: lookup failed:", error.message);
    return { ok: false, error: "Couldn't check that ball. Try again." };
  }
  if (!data) return { ok: true };

  const row = data as unknown as BallHolderRow;
  if (row.id === forPlayerId) return { ok: true }; // re-scanning the same player's own ball

  const booking = Array.isArray(row.bookings) ? row.bookings[0] : row.bookings;
  const wave = Array.isArray(booking?.waves) ? booking?.waves[0] : booking?.waves;
  const stillPlaying =
    wave != null &&
    booking != null &&
    isCurrentlyActive({ date: wave.date, startTime: wave.start_time }, booking.ticket_type, new Date());

  if (stillPlaying) {
    return {
      ok: false,
      error: `That ball is ${row.name}'s, playing now with ${booking?.lead_name}'s group. Scan a different one.`,
    };
  }

  await releaseBall(row.id);
  return { ok: true };
}

async function releaseBall(playerId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("booking_players")
    .update({ ball_released_at: new Date().toISOString() })
    .eq("id", playerId);
  if (error) console.error("releaseBall: update failed:", error.message);
}

export interface RegisterPlayerInput {
  bookingId: string;
  name: string;
  email?: string | null;
  /** Null when the reader wouldn't play ball — staff link one later. */
  ballTagId?: string | null;
}

export type PlayerResult = { ok: true; player: CheckInPlayer } | { ok: false; error: string };

export async function registerPlayer(input: RegisterPlayerInput): Promise<PlayerResult> {
  const name = normalizePlayerName(input.name);
  const tag = input.ballTagId ? normalizeBallTag(input.ballTagId) : null;

  if (tag) {
    const claim = await claimBallTag(tag);
    if (!claim.ok) return { ok: false, error: claim.error ?? "That ball is already in play." };
  }

  const { data, error } = await supabaseAdmin
    .from("booking_players")
    .insert({
      booking_id: input.bookingId,
      name,
      email: input.email?.trim() || null,
      ball_tag_id: tag,
      ball_linked_at: tag ? new Date().toISOString() : null,
    })
    .select("id, name, email, ball_tag_id")
    .single();

  if (error || !data) {
    console.error("registerPlayer: insert failed:", error?.message);
    return { ok: false, error: insertErrorMessage(error?.message, name) };
  }

  return { ok: true, player: { id: data.id, name: data.name, email: data.email, ballTagId: data.ball_tag_id } };
}

/** booking_players carries a unique index on (booking_id, lower(name)) from
 *  the kiosk's roster step — two Alexes in one group is a real thing at a
 *  door, so say what to do about it rather than "insert failed". */
function insertErrorMessage(message: string | undefined, name: string): string {
  if (message?.includes("booking_players_booking_id_name")) {
    return `There's already an ${name} in this group — add a surname or initial.`;
  }
  if (message?.includes("booking_players_active_ball_tag")) {
    return "That ball was just linked to someone else. Scan a different one.";
  }
  return "Couldn't save that player. Try again.";
}

export interface UpdatePlayerInput {
  playerId: string;
  name?: string;
  email?: string | null;
  /** A tag re-links the ball; explicit null unlinks it. `undefined` leaves it. */
  ballTagId?: string | null;
}

export async function updatePlayer(input: UpdatePlayerInput): Promise<PlayerResult> {
  const patch: Record<string, unknown> = {};

  if (input.name !== undefined) patch.name = normalizePlayerName(input.name);
  if (input.email !== undefined) patch.email = input.email?.trim() || null;

  if (input.ballTagId !== undefined) {
    const tag = input.ballTagId ? normalizeBallTag(input.ballTagId) : null;
    if (tag) {
      const claim = await claimBallTag(tag, input.playerId);
      if (!claim.ok) return { ok: false, error: claim.error ?? "That ball is already in play." };
    }
    patch.ball_tag_id = tag;
    patch.ball_linked_at = tag ? new Date().toISOString() : null;
    patch.ball_released_at = null;
  }

  const { data, error } = await supabaseAdmin
    .from("booking_players")
    .update(patch)
    .eq("id", input.playerId)
    .select("id, name, email, ball_tag_id")
    .single();

  if (error || !data) {
    console.error("updatePlayer: update failed:", error?.message);
    return { ok: false, error: insertErrorMessage(error?.message, patch.name as string) };
  }
  return { ok: true, player: { id: data.id, name: data.name, email: data.email, ballTagId: data.ball_tag_id } };
}

/** Removing a player hands their ball back — it's a mistyped row being undone
 *  at the door, not someone leaving mid-round. */
export async function removePlayer(playerId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin.from("booking_players").delete().eq("id", playerId);
  if (error) {
    console.error("removePlayer: delete failed:", error.message);
    return { ok: false, error: "Couldn't remove that player. Try again." };
  }
  return { ok: true };
}

// -----------------------------------------------------------------------------
// Screen 4 — done
// -----------------------------------------------------------------------------

/** Stamps the group as checked in. Re-checking in an already-stamped group is
 *  allowed (staff reopening it to fix a name) and just re-stamps. */
export async function completeCheckIn(bookingId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("bookings")
    .update({ checked_in_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) {
    console.error("completeCheckIn: update failed:", error.message);
    return { ok: false, error: "Couldn't finish check-in. Try again." };
  }
  return { ok: true };
}

// -----------------------------------------------------------------------------
// Walk-ins
// -----------------------------------------------------------------------------

/** The start time a walk-in would be put against right now, if any. */
export async function fetchWalkInWave(): Promise<{ id: string; startTime: string; peopleLeft: number } | null> {
  const today = todayInHongKong();
  const { data, error } = await supabaseAdmin
    .from("waves")
    .select("id, date, start_time, people_capacity, people_used, status")
    .eq("date", today)
    .neq("status", "provisional");

  if (error) {
    console.error("fetchWalkInWave: query failed:", error.message);
    return null;
  }

  const candidates = (data ?? []).map((w) => ({ id: w.id, date: w.date, startTime: w.start_time, row: w }));
  const picked = pickWalkInWave(candidates, new Date());
  if (!picked) return null;

  return {
    id: picked.id,
    startTime: picked.startTime.slice(0, 5),
    peopleLeft: Math.max(0, picked.row.people_capacity - picked.row.people_used),
  };
}

export interface WalkInInput {
  leadName: string;
  ticketType: TicketType;
  headcount: number;
}

/**
 * A group that turned up without booking. This is a real bookings row — the
 * scoring kiosk, the leaderboard and capacity all read `bookings`, so a
 * walk-in that lived anywhere else would be invisible to every one of them.
 *
 * It's written as `paid` because the money was taken at the door, outside
 * this system; `source = 'walk_in'` is what separates it from a Stripe
 * capture, and amount_paid_cents is the tariff owed at the same per-person
 * price as online. It consumes the slot's people capacity like any booking.
 */
export async function createWalkIn(
  input: WalkInInput
): Promise<{ ok: true; bookingId: string } | { ok: false; error: string }> {
  const wave = await fetchWalkInWave();
  if (!wave) return { ok: false, error: "No start time is open right now — add one in the admin panel first." };
  if (wave.peopleLeft < input.headcount) {
    return {
      ok: false,
      error:
        wave.peopleLeft > 0
          ? `Only ${wave.peopleLeft} ${wave.peopleLeft === 1 ? "space" : "spaces"} left at ${wave.startTime}.`
          : `${wave.startTime} is full.`,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .insert({
      wave_id: wave.id,
      lead_name: normalizePlayerName(input.leadName),
      lead_email: null,
      party_type: derivePartyTypeFromHeadcount(input.headcount),
      headcount: input.headcount,
      present_headcount: input.headcount,
      ticket_type: input.ticketType,
      amount_paid_cents: computeBookingTotalCents(input.ticketType, input.headcount),
      currency: CURRENCY,
      status: "paid",
      source: "walk_in",
      manage_token: generateManageToken(),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createWalkIn: insert failed:", error?.message);
    return { ok: false, error: "Couldn't start that walk-in. Try again." };
  }

  await reserveSeats(wave.id, input.headcount);
  return { ok: true, bookingId: data.id };
}
