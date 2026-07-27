// FILE: lib/email/send.ts
// -----------------------------------------------------------------------------
// Builds and sends each transactional email via sendEmailOnce(), which owns
// the send-exactly-once bookkeeping in `email_events`. This file only knows
// how to render an email's content from domain data.
// -----------------------------------------------------------------------------

import { render } from "@react-email/components";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmailOnce } from "./sendEmailOnce";
import { BookingConfirmationEmail } from "./BookingConfirmation";

export interface BookingForEmail {
  id: string;
  leadEmail: string;
  leadName: string;
  partyType: "solo" | "pair" | "group";
  headcount: number;
  amountPaidCents: number;
  currency: string;
  manageToken: string;
}

async function loadBookingForEmail(bookingId: string): Promise<BookingForEmail | null> {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id, lead_email, lead_name, party_type, headcount, amount_paid_cents, currency, manage_token")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) {
    console.error("loadBookingForEmail: booking not found", bookingId, error?.message);
    return null;
  }

  return {
    id: data.id,
    leadEmail: data.lead_email,
    leadName: data.lead_name,
    partyType: data.party_type,
    headcount: data.headcount,
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

  const manageUrl = manageUrlFor(booking.manageToken);

  return sendEmailOnce(booking.id, "booking_confirmation", async () => ({
    to: booking.leadEmail,
    subject: "You're in — your UTOPIA reservation is confirmed",
    html: await render(
      BookingConfirmationEmail({
        leadName: booking.leadName,
        partyType: booking.partyType,
        headcount: booking.headcount,
        amountPaidCents: booking.amountPaidCents,
        currency: booking.currency,
        manageUrl,
      })
    ),
  }));
}
