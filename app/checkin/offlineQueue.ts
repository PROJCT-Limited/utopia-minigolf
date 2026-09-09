// FILE: app/checkin/offlineQueue.ts
// -----------------------------------------------------------------------------
// Keeps a half-registered group from being lost when the venue wifi drops.
//
// Every write on this screen is a Server Action, so a dead connection means a
// rejected promise mid-roster — with a queue of guests watching. Instead of
// failing the step, the player is held in localStorage, shown on screen as
// "waiting to sync", and replayed when the tablet is back online. The
// in-progress screen state is persisted the same way, so even a reload or a
// browser crash resumes where the door left off.
//
// localStorage, not IndexedDB: this is a handful of rows for the length of one
// check-in, and it has to survive nothing more than a page reload.
// -----------------------------------------------------------------------------

import type { RegisterPlayerActionInput } from "@/lib/checkin/checkinActions";

const QUEUE_KEY = "found.checkin.queue.v1";
const DRAFT_KEY = "found.checkin.draft.v1";

export interface QueuedPlayer {
  /** Local id, used as the React key and to drop the row once it lands. */
  id: string;
  queuedAt: number;
  input: RegisterPlayerActionInput;
}

export interface CheckInDraft {
  bookingId: string;
  presentHeadcount: number;
  /** Which screen the door was on, so a reload doesn't restart the group. */
  screen: "confirm" | "players" | "ready";
}

// A tablet with storage disabled or full must still be able to check people
// in — every accessor degrades to "no draft, empty queue" rather than throwing.
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the check-in still has to finish */
  }
}

function remove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export function readQueue(): QueuedPlayer[] {
  return read<QueuedPlayer[]>(QUEUE_KEY, []);
}

export function queuePlayer(input: RegisterPlayerActionInput): QueuedPlayer {
  const entry: QueuedPlayer = {
    id: `queued-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: Date.now(),
    input,
  };
  write(QUEUE_KEY, [...readQueue(), entry]);
  return entry;
}

export function dropQueued(id: string): void {
  const remaining = readQueue().filter((entry) => entry.id !== id);
  if (remaining.length === 0) remove(QUEUE_KEY);
  else write(QUEUE_KEY, remaining);
}

export function queuedForBooking(bookingId: string): QueuedPlayer[] {
  return readQueue().filter((entry) => entry.input.bookingId === bookingId);
}

/**
 * Replays what's waiting, oldest first. A rejected entry (the connection is
 * still down) stays queued for the next attempt; one the server refuses on its
 * merits — a duplicate name, a ball someone else now holds — is dropped and
 * reported, because retrying it forever would never succeed.
 */
export async function flushQueue(
  send: (input: RegisterPlayerActionInput) => Promise<{ ok: boolean; error?: string }>
): Promise<{ synced: number; rejected: string[] }> {
  const rejected: string[] = [];
  let synced = 0;

  for (const entry of readQueue()) {
    try {
      const result = await send(entry.input);
      if (result.ok) {
        synced++;
      } else {
        rejected.push(`${entry.input.name}: ${result.error ?? "couldn't be saved"}`);
      }
      dropQueued(entry.id);
    } catch {
      break; // still offline — leave this and everything after it queued
    }
  }

  return { synced, rejected };
}

// ---------------------------------------------------------------------------
// In-progress screen state
// ---------------------------------------------------------------------------

export function readDraft(): CheckInDraft | null {
  return read<CheckInDraft | null>(DRAFT_KEY, null);
}

export function saveDraft(draft: CheckInDraft): void {
  write(DRAFT_KEY, draft);
}

export function clearDraft(): void {
  remove(DRAFT_KEY);
}
