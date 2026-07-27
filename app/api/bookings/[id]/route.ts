// FILE: app/api/bookings/[id]/route.ts
// -----------------------------------------------------------------------------
// GET /api/bookings/:id — polled by the confirmation page while it waits for
// the Stripe webhook to flip the booking to 'paid'. Deliberately minimal:
// just enough to know whether to keep polling.
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { fetchBookingSummary } from "@/lib/booking/bookingRepo";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await fetchBookingSummary(id);
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ status: booking.status });
}
