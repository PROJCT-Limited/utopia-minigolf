// FILE: lib/email/BookingRescheduled.tsx
// -----------------------------------------------------------------------------
// React Email template sent the moment a self-serve reschedule (lib/booking/
// reschedule.ts) succeeds. Confirms the booking moved to its new wave — with
// the exact date/time if that wave is already confirmed, or the same
// still-provisional notice as the original confirmation email otherwise.
// Rendered to HTML by lib/email/send.ts and sent via Resend.
// -----------------------------------------------------------------------------

import { Text } from "@react-email/components";
import { partyTypeLabels } from "./format";
import { EmailShell } from "./components/EmailShell";
import { EmailButton } from "./components/EmailButton";
import {
  EmailDetailBox,
  EmailHeading,
  MonoLabel,
  bodyText,
} from "./components/EmailPrimitives";
import { TICKET_TYPE_LABELS, type TicketType } from "@/lib/booking/pricing";
import { formatWaveDate } from "@/app/utils/formatWave";

export interface BookingRescheduledEmailProps {
  leadName: string;
  partyType: "solo" | "pair" | "group";
  headcount: number;
  ticketType: TicketType;
  manageUrl: string;
  newWaveDate: string;
  newWaveTimeLabel: string;
  newWaveIsConfirmed: boolean;
}

export function BookingRescheduledEmail({
  leadName,
  partyType,
  headcount,
  ticketType,
  manageUrl,
  newWaveDate,
  newWaveTimeLabel,
  newWaveIsConfirmed,
}: BookingRescheduledEmailProps) {
  const firstName = leadName.trim().split(/\s+/)[0] || leadName;

  return (
    <EmailShell previewText="Your FOUND reservation has been rescheduled" manageUrl={manageUrl}>
      <MonoLabel>Reservation rescheduled</MonoLabel>
      <EmailHeading>You&rsquo;re all set, {firstName}.</EmailHeading>
      <Text style={bodyText}>
        Your FOUND reservation has been rescheduled — {partyTypeLabels[partyType]}, {headcount}{" "}
        {headcount === 1 ? "player" : "players"}.
      </Text>

      <EmailDetailBox
        rows={[
          { label: "Ticket", value: TICKET_TYPE_LABELS[ticketType] },
          {
            label: "New date",
            value: newWaveIsConfirmed
              ? `${formatWaveDate(newWaveDate)}, ${newWaveTimeLabel}`
              : "To be confirmed",
          },
        ]}
      />


      <Text style={bodyText}>
        This booking has now used its one self-serve reschedule — for any further changes, just reply to this
        email.
      </Text>

      <EmailButton href={manageUrl}>Manage your booking</EmailButton>

      <Text style={bodyText}>See you at FOUND.</Text>
    </EmailShell>
  );
}

export default BookingRescheduledEmail;
