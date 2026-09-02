// FILE: lib/scoring/scoringActions.ts
// -----------------------------------------------------------------------------
// Server actions behind the /kiosk flow. No auth — the kiosk is public by
// design, same as the booking flow itself; every read/write still goes
// through the service-role client, never direct client access. Includes read
// wrappers (not just mutations) since KioskFlow.tsx is a client component
// that needs to re-fetch as the guest steps through group -> roster ->
// player -> scores.
// -----------------------------------------------------------------------------
"use server";

import { revalidatePath } from "next/cache";
import {
  fetchCurrentGroups,
  fetchRosterForGroup,
  createBookingRoster,
  fetchScoresForPlayer,
  fetchScoresForRoster,
  saveStationScore,
  type GroupKind,
  type CurrentGroup,
  type RosterPlayer,
} from "./scoringRepo";

export async function fetchCurrentGroupsAction(): Promise<CurrentGroup[]> {
  return fetchCurrentGroups();
}

export async function fetchRosterForGroupAction(kind: GroupKind, id: string): Promise<RosterPlayer[]> {
  return fetchRosterForGroup(kind, id);
}

export interface CreateRosterResult {
  ok: boolean;
  players?: RosterPlayer[];
  error?: string;
}

export async function createBookingRosterAction(bookingId: string, names: string[]): Promise<CreateRosterResult> {
  const trimmed = names.map((n) => n.trim()).filter((n) => n.length > 0);
  if (trimmed.length === 0) {
    return { ok: false, error: "Enter at least one player name." };
  }

  const players = await createBookingRoster(bookingId, trimmed);
  if (players.length === 0) {
    return { ok: false, error: "Couldn't save the player names. Please try again." };
  }

  revalidatePath("/kiosk");
  return { ok: true, players };
}

export async function fetchScoresForPlayerAction(kind: GroupKind, playerId: string): Promise<Record<number, number>> {
  return fetchScoresForPlayer(kind, playerId);
}

export async function fetchScoresForRosterAction(
  kind: GroupKind,
  playerIds: string[]
): Promise<Record<string, Record<number, number>>> {
  return fetchScoresForRoster(kind, playerIds);
}

export interface SaveScoreResult {
  ok: boolean;
  error?: string;
}

export async function saveStationScoreAction(
  kind: GroupKind,
  playerId: string,
  stationNumber: number,
  strokes: number
): Promise<SaveScoreResult> {
  const result = await saveStationScore(kind, playerId, stationNumber, strokes);
  if (result.ok) revalidatePath("/");
  return result;
}
