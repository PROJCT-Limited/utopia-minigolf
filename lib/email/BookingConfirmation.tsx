// FILE: lib/email/BookingConfirmation.tsx
// -----------------------------------------------------------------------------
// React Email template sent the moment a booking is paid. Confirms the
// reservation and the payment, is explicit that the exact date/time is still
// provisional, and hands over the manage-booking link. Rendered to HTML by
// lib/email/send.ts and sent via Resend.
// -----------------------------------------------------------------------------

import { Text } from "@react-email/components";
import { formatMoney, partyTypeLabels } from "./format";
import { EmailShell } from "./components/EmailShell";
import { EmailButton } from "./components/EmailButton";
import {
  EmailDetailBox,
  EmailHeading,
  MonoLabel,
  bodyText,
} from "./components/EmailPrimitives";
import { RESCHEDULE_NOTICE } from "@/lib/booking/copy";
import { TICKET_TYPE_LABELS, type TicketType } from "@/lib/booking/pricing";
import { formatWaveDate } from "@/app/utils/formatWave";

export interface BookingConfirmationEmailProps {
  leadName: string;
  partyType: "solo" | "pair" | "group";
  headcount: number;
  ticketType: TicketType;
  amountPaidCents: number;
  currency: string;
  waveDate: string | null;
  waveTimeLabel: string | null;
  waveIsConfirmed: boolean;
  manageUrl: string;
}

export function BookingConfirmationEmail({
  leadName,
  partyType,
  headcount,
  ticketType,
  amountPaidCents,
  currency,
  waveDate,
  waveTimeLabel,
  waveIsConfirmed,
  manageUrl,
}: BookingConfirmationEmailProps) {
  const firstName = leadName.trim().split(/\s+/)[0] || leadName;

  return (
    <EmailShell previewText="Your FOUND reservation is confirmed" manageUrl={manageUrl}>
      <MonoLabel>Reservation confirmed</MonoLabel>
      <EmailHeading>You&rsquo;re in, {firstName}.</EmailHeading>
      <Text style={bodyText}>
        Your FOUND reservation is confirmed and paid in full — {partyTypeLabels[partyType]},{" "}
        {headcount} {headcount === 1 ? "player" : "players"}.
      </Text>

      <EmailDetailBox
        rows={[
          { label: "Ticket", value: TICKET_TYPE_LABELS[ticketType] },
          { label: "Amount paid", value: formatMoney(amountPaidCents, currency) },
          {
            label: "Slot",
            value:
              waveIsConfirmed && waveDate ? `${formatWaveDate(waveDate)}, ${waveTimeLabel}` : "To be confirmed",
          },
        ]}
      />

      <Text style={bodyText}>{RESCHEDULE_NOTICE}</Text>

      <EmailButton href={manageUrl}>Manage your booking</EmailButton>

      <Text style={bodyText}>See you at FOUND.</Text>
    </EmailShell>
  );
}

export default BookingConfirmationEmail;
