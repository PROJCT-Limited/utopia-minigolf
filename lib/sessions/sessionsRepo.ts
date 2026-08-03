// FILE: lib/sessions/sessionsRepo.ts
// -----------------------------------------------------------------------------
// Read-side lookups for public sessions — the /session/[token] page, the
// /manage/[token] page (for a participant token), the participant status
// poll route, and createSession/joinSession's own capacity checks.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface SessionRow {
  id: string;
  wave_id: string;
  max_players: number;
  share_token: string;
  status: "open" | "full";
}

export interface SessionParticipantRow {
  id: string;
  session_id: string;
  name: string;
  email: string;
  amount_paid_cents: number;
  currency: string;
  status: "pending" | "paid" | "cancelled";
  manage_token: string;
  is_host: boolean;
}

export interface SessionForView {
  id: string;
  waveId: string;
  maxPlayers: number;
  status: "open" | "full";
  shareToken: string;
  paidCount: number;
  paidParticipantNames: string[];
}

const SESSION_COLUMNS = "id, wave_id, max_players, share_token, status";

function toParticipantNames(rows: { name: string }[]): string[] {
  return rows.map((r) => r.name.trim().split(/\s+/)[0] || r.name);
}

export async function fetchSessionByShareToken(shareToken: string): Promise<SessionForView | null> {
  const { data: session, error } = await supabaseAdmin
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("share_token", shareToken)
    .maybeSingle();

  if (error || !session) return null;

  const { data: paidRows, error: participantsError } = await supabaseAdmin
    .from("session_participants")
    .select("name")
    .eq("session_id", session.id)
    .eq("status", "paid")
    .order("created_at", { ascending: true });

  if (participantsError) {
    console.error("fetchSessionByShareToken: participants query failed:", participantsError.message);
  }

  return {
    id: session.id,
    waveId: session.wave_id,
    maxPlayers: session.max_players,
    status: session.status,
    shareToken: session.share_token,
    paidCount: paidRows?.length ?? 0,
    paidParticipantNames: toParticipantNames(paidRows ?? []),
  };
}

export async function fetchSessionById(sessionId: string): Promise<SessionRow | null> {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !data) return null;
  return data as SessionRow;
}

export async function fetchSessionParticipantById(participantId: string): Promise<SessionParticipantRow | null> {
  const { data, error } = await supabaseAdmin
    .from("session_participants")
    .select("id, session_id, name, email, amount_paid_cents, currency, status, manage_token, is_host")
    .eq("id", participantId)
    .maybeSingle();

  if (error || !data) return null;
  return data as SessionParticipantRow;
}

export async function countPaidParticipants(sessionId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("session_participants")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("status", "paid");

  if (error) {
    console.error("countPaidParticipants: query failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

export interface SessionForManage {
  participant: {
    id: string;
    name: string;
    email: string;
    amountPaidCents: number;
    currency: string;
    status: "pending" | "paid" | "cancelled";
    isHost: boolean;
  };
  session: SessionForView;
}

export async function fetchSessionByParticipantManageToken(token: string): Promise<SessionForManage | null> {
  const { data: participant, error } = await supabaseAdmin
    .from("session_participants")
    .select("id, session_id, name, email, amount_paid_cents, currency, status, manage_token, is_host")
    .eq("manage_token", token)
    .maybeSingle();

  if (error || !participant) return null;

  const { data: sessionRow, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("id", participant.session_id)
    .maybeSingle();

  if (sessionError || !sessionRow) return null;

  const { data: paidRows } = await supabaseAdmin
    .from("session_participants")
    .select("name")
    .eq("session_id", sessionRow.id)
    .eq("status", "paid")
    .order("created_at", { ascending: true });

  return {
    participant: {
      id: participant.id,
      name: participant.name,
      email: participant.email,
      amountPaidCents: participant.amount_paid_cents,
      currency: participant.currency,
      status: participant.status,
      isHost: participant.is_host,
    },
    session: {
      id: sessionRow.id,
      waveId: sessionRow.wave_id,
      maxPlayers: sessionRow.max_players,
      status: sessionRow.status,
      shareToken: sessionRow.share_token,
      paidCount: paidRows?.length ?? 0,
      paidParticipantNames: toParticipantNames(paidRows ?? []),
    },
  };
}
