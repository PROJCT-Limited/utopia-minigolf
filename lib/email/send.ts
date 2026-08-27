// FILE: lib/email/send.ts
// -----------------------------------------------------------------------------
// Builds and sends each transactional email via sendEmailOnce(), which owns
// the send-exactly-once bookkeeping in `email_events`. This file only knows
// how to render an email's content from domain data.
// -----------------------------------------------------------------------------

import { render } from "@react-email/components";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchWaveById } from "@/lib/booking/wavesRepo";
import { fetchSessionById, countPaidParticipants } from "@/lib/sessions/sessionsRepo";
import type { TicketType } from "@/lib/booking/pricing";
import { sendEmailOnce } from "./sendEmailOnce";
import { resend } from "./resendClient";
import { BookingConfirmationEmail } from "./BookingConfirmation";
import { BookingRescheduledEmail } from "./BookingRescheduled";
import { HostSessionCreatedEmail } from "./HostSessionCreated";
import { SessionParticipantJoinedEmail } from "./SessionParticipantJoined";

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

function shareUrlFor(shareToken: string): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/session/${shareToken}`;
}

export async function sendBookingConfirmation(bookingId: string): Promise<{ sent: boolean }> {
  const booking = await loadBookingForEmail(bookingId);
  if (!booking) return { sent: false };

  const wave = await fetchWaveById(booking.waveId);
  const manageUrl = manageUrlFor(booking.manageToken);
  const waveIsConfirmed = wave?.status === "confirmed" || wave?.status === "full";

  return sendEmailOnce(booking.id, "booking_confirmation", async () => ({
    to: booking.leadEmail,
    subject: "You're in — your UTOPIA reservation is confirmed",
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
    subject: "Your UTOPIA reservation has been rescheduled",
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

// -----------------------------------------------------------------------------
// Session participant emails. Unlike bookings, these don't go through
// sendEmailOnce/email_events (which has a hard FK to bookings.id) — each
// participant gets exactly one email, mutually exclusive by is_host, so a
// plain `email_sent` flag on the row is enough. See migration
// 003_public_sessions.sql for why.
// -----------------------------------------------------------------------------

interface SessionParticipantForEmail {
  id: string;
  sessionId: string;
  name: string;
  email: string;
  amountPaidCents: number;
  currency: string;
  manageToken: string;
  emailSent: boolean;
}

async function loadSessionParticipantForEmail(participantId: string): Promise<SessionParticipantForEmail | null> {
  const { data, error } = await supabaseAdmin
    .from("session_participants")
    .select("id, session_id, name, email, amount_paid_cents, currency, manage_token, email_sent")
    .eq("id", participantId)
    .maybeSingle();

  if (error || !data) {
    console.error("loadSessionParticipantForEmail: participant not found", participantId, error?.message);
    return null;
  }

  return {
    id: data.id,
    sessionId: data.session_id,
    name: data.name,
    email: data.email,
    amountPaidCents: data.amount_paid_cents,
    currency: data.currency,
    manageToken: data.manage_token,
    emailSent: data.email_sent,
  };
}

async function markSessionParticipantEmailSent(participantId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("session_participants")
    .update({ email_sent: true, updated_at: new Date().toISOString() })
    .eq("id", participantId);
  if (error) {
    console.error("markSessionParticipantEmailSent: update failed:", error.message);
  }
}

export async function sendHostSessionCreated(participantId: string): Promise<{ sent: boolean }> {
  const participant = await loadSessionParticipantForEmail(participantId);
  if (!participant) {
    console.error("sendHostSessionCreated: participant not found", participantId);
    return { sent: false };
  }
  if (participant.emailSent) return { sent: false };

  const session = await fetchSessionById(participant.sessionId);
  if (!session) {
    console.error("sendHostSessionCreated: session not found for participant", participantId, participant.sessionId);
    return { sent: false };
  }

  const wave = await fetchWaveById(session.wave_id);
  const waveIsConfirmed = wave?.status === "confirmed" || wave?.status === "full";

  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: participant.email,
      subject: "Your UTOPIA session is live — share your link",
      html: await render(
        HostSessionCreatedEmail({
          hostName: participant.name,
          ticketType: session.ticket_type,
          amountPaidCents: participant.amountPaidCents,
          currency: participant.currency,
          waveDate: wave?.date ?? null,
          waveTimeLabel: wave?.timeLabel ?? null,
          waveIsConfirmed,
          shareUrl: shareUrlFor(session.share_token),
          manageUrl: manageUrlFor(participant.manageToken),
        })
      ),
    });
    if (error) {
      console.error("sendHostSessionCreated: Resend returned an error:", JSON.stringify(error));
      return { sent: false };
    }
  } catch (err) {
    console.error("sendHostSessionCreated: send threw:", (err as Error).message);
    return { sent: false };
  }

  await markSessionParticipantEmailSent(participant.id);
  return { sent: true };
}

export async function sendSessionParticipantJoined(participantId: string): Promise<{ sent: boolean }> {
  const participant = await loadSessionParticipantForEmail(participantId);
  if (!participant) {
    console.error("sendSessionParticipantJoined: participant not found", participantId);
    return { sent: false };
  }
  if (participant.emailSent) return { sent: false };

  const session = await fetchSessionById(participant.sessionId);
  if (!session) {
    console.error("sendSessionParticipantJoined: session not found for participant", participantId, participant.sessionId);
    return { sent: false };
  }

  const paidCount = await countPaidParticipants(session.id);
  const wave = await fetchWaveById(session.wave_id);
  const waveIsConfirmed = wave?.status === "confirmed" || wave?.status === "full";

  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: participant.email,
      subject: "You're in — your UTOPIA session place is confirmed",
      html: await render(
        SessionParticipantJoinedEmail({
          participantName: participant.name,
          ticketType: session.ticket_type,
          amountPaidCents: participant.amountPaidCents,
          currency: participant.currency,
          paidCount,
          maxPlayers: session.max_players,
          waveDate: wave?.date ?? null,
          waveTimeLabel: wave?.timeLabel ?? null,
          waveIsConfirmed,
          manageUrl: manageUrlFor(participant.manageToken),
        })
      ),
    });
    if (error) {
      console.error("sendSessionParticipantJoined: Resend returned an error:", JSON.stringify(error));
      return { sent: false };
    }
  } catch (err) {
    console.error("sendSessionParticipantJoined: send threw:", (err as Error).message);
    return { sent: false };
  }

  await markSessionParticipantEmailSent(participant.id);
  return { sent: true };
}
