// FILE: lib/email/BookingRescheduled.tsx
// -----------------------------------------------------------------------------
// React Email template sent the moment a self-serve reschedule (lib/booking/
// reschedule.ts) succeeds. Confirms the booking moved to its new wave — with
// the exact date/time if that wave is already confirmed, or the same
// still-provisional notice as the original confirmation email otherwise.
// Rendered to HTML by lib/email/send.ts and sent via Resend.
// -----------------------------------------------------------------------------

import { Heading, Hr, Text } from "@react-email/components";
import { partyTypeLabels } from "./format";
import { EmailShell } from "./components/EmailShell";
import { EmailButton } from "./components/EmailButton";
import { colors, bodyFontStack, displayFontStack } from "./components/theme";
import { DATE_TBC_NOTICE } from "@/lib/booking/copy";
import { formatWaveDate } from "@/app/utils/formatWave";

export interface BookingRescheduledEmailProps {
  leadName: string;
  partyType: "solo" | "pair" | "group";
  headcount: number;
  manageUrl: string;
  newWaveDate: string;
  newWaveTimeLabel: string;
  newWaveIsConfirmed: boolean;
}

const bodyText = {
  margin: "0 0 16px",
  fontFamily: bodyFontStack,
  fontSize: "15px",
  lineHeight: "1.6",
  color: colors.ink,
};

const noticeBox = {
  margin: "0 0 20px",
  padding: "16px 18px",
  borderRadius: "14px",
  backgroundColor: colors.blueWash,
  fontFamily: bodyFontStack,
  fontSize: "14px",
  lineHeight: "1.55",
  color: colors.ink,
};

const bigNumber = {
  fontFamily: displayFontStack,
  fontSize: "20px",
  fontWeight: 500,
  color: colors.ink,
};

export function BookingRescheduledEmail({
  leadName,
  partyType,
  headcount,
  manageUrl,
  newWaveDate,
  newWaveTimeLabel,
  newWaveIsConfirmed,
}: BookingRescheduledEmailProps) {
  const firstName = leadName.trim().split(/\s+/)[0] || leadName;

  return (
    <EmailShell previewText="Your UTOPIA reservation has been rescheduled" manageUrl={manageUrl}>
      <Heading style={{ margin: "0 0 12px", fontFamily: displayFontStack, fontWeight: 500, fontSize: "20px", color: colors.ink }}>
        You&apos;re all set, {firstName}.
      </Heading>
      <Text style={bodyText}>
        Your UTOPIA reservation has been rescheduled — {partyTypeLabels[partyType]}, {headcount}{" "}
        {headcount === 1 ? "player" : "players"}.
      </Text>

      <Hr style={{ borderColor: colors.rule, margin: "0 0 20px" }} />
      <Text style={{ ...bodyText, margin: "0 0 4px" }}>
        <strong>New date</strong>
      </Text>
      <Text style={{ ...bigNumber, margin: "0 0 20px" }}>
        {newWaveIsConfirmed ? `${formatWaveDate(newWaveDate)}, ${newWaveTimeLabel}` : "To be confirmed"}
      </Text>
      <Hr style={{ borderColor: colors.rule, margin: "0 0 20px" }} />

      {!newWaveIsConfirmed && <Text style={noticeBox}>{DATE_TBC_NOTICE}</Text>}

      <Text style={bodyText}>
        This booking has now used its one self-serve reschedule — for any further changes, just reply to this
        email.
      </Text>

      <EmailButton href={manageUrl}>Manage your booking</EmailButton>

      <Text style={bodyText}>See you on the trail.</Text>
    </EmailShell>
  );
}

export default BookingRescheduledEmail;
