// FILE: lib/sessions/sessionCapacity.ts
// -----------------------------------------------------------------------------
// Pure session-joinability rules — no Supabase import here on purpose (same
// reasoning as lib/booking/waves.ts), so this is testable without a database
// and safe to import from the client-rendered session page.
// -----------------------------------------------------------------------------

export interface SessionCapacityInput {
  status: "open" | "full";
  paidCount: number;
  maxPlayers: number;
  waveIsFull: boolean;
}

export function isSessionJoinable(input: SessionCapacityInput): boolean {
  return input.status !== "full" && input.paidCount < input.maxPlayers && !input.waveIsFull;
}

export function shouldSessionBecomeFull(input: Omit<SessionCapacityInput, "status">): boolean {
  return input.paidCount >= input.maxPlayers || input.waveIsFull;
}
