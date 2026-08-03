// FILE: app/api/session-participants/[id]/route.ts
// -----------------------------------------------------------------------------
// GET /api/session-participants/:id — polled by the session page while it
// waits for the Stripe webhook to flip a just-paid participant to 'paid'.
// Deliberately minimal, mirrors app/api/bookings/[id]/route.ts.
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { fetchSessionParticipantById } from "@/lib/sessions/sessionsRepo";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const participant = await fetchSessionParticipantById(id);
  if (!participant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ status: participant.status });
}
