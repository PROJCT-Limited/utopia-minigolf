// FILE: lib/checkin/checkinActions.ts
// -----------------------------------------------------------------------------
// Server actions behind the door check-in tablet (app/checkin/). Read wrappers
// as well as mutations, same as lib/scoring/scoringActions.ts — CheckInFlow is
// a client component that re-reads the group after every write so the screen
// shows the database, not its own optimism.
//
// Unlike the scoring kiosk these are NOT public: /checkin sits behind the
// admin session gate in proxy.ts (it lists today's guests by name with their
// payment status), and Server Function calls to it go through that same gate.
// -----------------------------------------------------------------------------
"use server";

import { revalidatePath } from "next/cache";
import { isValidTicketType, MAX_HEADCOUNT, type TicketType } from "@/lib/booking/pricing";
import { isValidBallTag, isValidPlayerName, isValidPresentHeadcount, normalizeBallTag } from "./checkin";
import {
  completeCheckIn,
  createWalkIn,
  fetchGroup,
  fetchTodaysArrivals,
  fetchWalkInWave,
  registerPlayer,
  removePlayer,
  setPresentHeadcount,
  updatePlayer,
  type CheckInBooking,
  type CheckInPlayer,
  type PlayerResult,
} from "./checkinRepo";

export interface GroupState {
  booking: CheckInBooking;
  players: CheckInPlayer[];
}

export async function fetchArrivalsAction(): Promise<CheckInBooking[]> {
  return fetchTodaysArrivals();
}

export async function fetchGroupAction(bookingId: string): Promise<GroupState | null> {
  return fetchGroup(bookingId);
}

export async function setPresentHeadcountAction(
  bookingId: string,
  present: number
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidPresentHeadcount(present)) {
    return { ok: false, error: `A group is 1 to ${MAX_HEADCOUNT} players.` };
  }
  const result = await setPresentHeadcount(bookingId, present);
  if (result.ok) revalidatePath("/checkin");
  return result;
}

export interface RegisterPlayerActionInput {
  bookingId: string;
  name: string;
  email?: string | null;
  ballTagId?: string | null;
}

export async function registerPlayerAction(input: RegisterPlayerActionInput): Promise<PlayerResult> {
  if (!isValidPlayerName(input.name)) {
    return { ok: false, error: "Enter this player's name." };
  }
  if (input.ballTagId && !isValidBallTag(input.ballTagId)) {
    return { ok: false, error: "That doesn't look like a ball ID." };
  }

  const result = await registerPlayer({
    bookingId: input.bookingId,
    name: input.name,
    email: input.email,
    ballTagId: input.ballTagId ? normalizeBallTag(input.ballTagId) : null,
  });
  if (result.ok) revalidatePath("/checkin");
  return result;
}

export interface UpdatePlayerActionInput {
  playerId: string;
  name?: string;
  email?: string | null;
  ballTagId?: string | null;
}

export async function updatePlayerAction(input: UpdatePlayerActionInput): Promise<PlayerResult> {
  if (input.name !== undefined && !isValidPlayerName(input.name)) {
    return { ok: false, error: "Enter this player's name." };
  }
  if (input.ballTagId && !isValidBallTag(input.ballTagId)) {
    return { ok: false, error: "That doesn't look like a ball ID." };
  }

  const result = await updatePlayer(input);
  if (result.ok) revalidatePath("/checkin");
  return result;
}

export async function removePlayerAction(playerId: string): Promise<{ ok: boolean; error?: string }> {
  const result = await removePlayer(playerId);
  if (result.ok) revalidatePath("/checkin");
  return result;
}

export async function completeCheckInAction(bookingId: string): Promise<{ ok: boolean; error?: string }> {
  const result = await completeCheckIn(bookingId);
  if (result.ok) {
    revalidatePath("/checkin");
    revalidatePath("/kiosk");
  }
  return result;
}

export async function fetchWalkInWaveAction(): Promise<{ id: string; startTime: string; peopleLeft: number } | null> {
  return fetchWalkInWave();
}

export async function createWalkInAction(input: {
  leadName: string;
  ticketType: TicketType;
  headcount: number;
}): Promise<{ ok: true; bookingId: string } | { ok: false; error: string }> {
  if (!isValidPlayerName(input.leadName)) {
    return { ok: false, error: "Enter a name for the group." };
  }
  if (!isValidTicketType(input.ticketType)) {
    return { ok: false, error: "Pick a ticket type." };
  }
  if (!isValidPresentHeadcount(input.headcount)) {
    return { ok: false, error: `A group is 1 to ${MAX_HEADCOUNT} players.` };
  }

  const result = await createWalkIn(input);
  if (result.ok) {
    revalidatePath("/checkin");
    revalidatePath("/kiosk");
  }
  return result;
}
