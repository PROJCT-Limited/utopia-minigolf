// FILE: lib/email/send.ts
// -----------------------------------------------------------------------------
// Builds and sends each transactional email via sendEmailOnce(), which owns
// the send-exactly-once bookkeeping in `email_events`. This file only knows
// how to render an email's content from domain data.
// -----------------------------------------------------------------------------

import { render } from "@react-email/components";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchWaveById } from "@/lib/booking/wavesRepo";
import type { TicketType } from "@/lib/booking/pricing";
import { sendEmailOnce } from "./sendEmailOnce";
import { BookingConfirmationEmail } from "./BookingConfirmation";
import { BookingRescheduledEmail } from "./BookingRescheduled";

export interface BookingForEmail {
  id: string;
  waveId: string;
  leadEmail: string;
  leadName: string;
  partyType: "solo" | "pair" | "group";
  headcount: number;
  ticketType: TicketType;
  amountPaidCents: number;
  currency: string;
  manageToken: string;
}

async function loadBookingForEmail(bookingId: string): Promise<BookingForEmail | null> {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id, wave_id, lead_email, lead_name, party_type, headcount, ticket_type, amount_paid_cents, currency, manage_token")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) {
    console.error("loadBookingForEmail: booking not found", bookingId, error?.message);
    return null;
  }

  return {
    id: data.id,
    waveId: data.wave_id,
    leadEmail: data.lead_email,
    leadName: data.lead_name,
    partyType: data.party_type,
    headcount: data.headcount,
    ticketType: data.ticket_type,
    amountPaidCents: data.amount_paid_cents,
    currency: data.currency,
    manageToken: data.manage_token,
  };
}

function manageUrlFor(manageToken: string): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/manage/${manageToken}`;
}

export async function sendBookingConfirmation(bookingId: string): Promise<{ sent: boolean }> {
  const booking = await loadBookingForEmail(bookingId);
  if (!booking) return { sent: false };

  const wave = await fetchWaveById(booking.waveId);
  const manageUrl = manageUrlFor(booking.manageToken);
  const waveIsConfirmed = wave?.status === "confirmed" || wave?.status === "full";

  return sendEmailOnce(booking.id, "booking_confirmation", async () => ({
    to: booking.leadEmail,
    subject: "You're in — your FOUND reservation is confirmed",
    html: await render(
      BookingConfirmationEmail({
        leadName: booking.leadName,
        partyType: booking.partyType,
        headcount: booking.headcount,
        ticketType: booking.ticketType,
        amountPaidCents: booking.amountPaidCents,
        currency: booking.currency,
        waveDate: wave?.date ?? null,
        waveTimeLabel: wave?.timeLabel ?? null,
        waveIsConfirmed,
        manageUrl,
      })
    ),
  }));
}

// Fires once from rescheduleBooking() (lib/booking/reschedule.ts) right after
// a self-serve reschedule succeeds — booking.waveId is already the *new*
// wave by the time this runs, so this always describes where the guest is
// rescheduled to, never the wave they left.
export async function sendBookingRescheduled(bookingId: string): Promise<{ sent: boolean }> {
  const booking = await loadBookingForEmail(bookingId);
  if (!booking) return { sent: false };

  const wave = await fetchWaveById(booking.waveId);
  if (!wave) return { sent: false };

  const manageUrl = manageUrlFor(booking.manageToken);
  const waveIsConfirmed = wave.status === "confirmed" || wave.status === "full";

  return sendEmailOnce(booking.id, "booking_rescheduled", async () => ({
    to: booking.leadEmail,
    subject: "Your FOUND reservation has been rescheduled",
    html: await render(
      BookingRescheduledEmail({
        leadName: booking.leadName,
        partyType: booking.partyType,
        headcount: booking.headcount,
        ticketType: booking.ticketType,
        manageUrl,
        newWaveDate: wave.date,
        newWaveTimeLabel: wave.timeLabel,
        newWaveIsConfirmed: waveIsConfirmed,
      })
    ),
  }));
}
