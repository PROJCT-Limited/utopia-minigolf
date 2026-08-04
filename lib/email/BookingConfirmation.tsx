// FILE: lib/email/BookingConfirmation.tsx
// -----------------------------------------------------------------------------
// React Email template sent the moment a booking is paid. Confirms the
// reservation and the payment, is explicit that the exact date/time is still
// provisional, and hands over the manage-booking link. Rendered to HTML by
// lib/email/send.ts and sent via Resend.
// -----------------------------------------------------------------------------

import { Heading, Hr, Text } from "@react-email/components";
import { formatMoney, partyTypeLabels } from "./format";
import { EmailShell } from "./components/EmailShell";
import { EmailButton } from "./components/EmailButton";
import { colors, bodyFontStack, displayFontStack } from "./components/theme";
import { DATE_TBC_NOTICE, RESCHEDULE_NOTICE } from "@/lib/booking/copy";
import { formatWaveDate } from "@/app/utils/formatWave";

export interface BookingConfirmationEmailProps {
  leadName: string;
  partyType: "solo" | "pair" | "group";
  headcount: number;
  amountPaidCents: number;
  currency: string;
  waveDate: string | null;
  waveTimeLabel: string | null;
  waveIsConfirmed: boolean;
  manageUrl: string;
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

export function BookingConfirmationEmail({
  leadName,
  partyType,
  headcount,
  amountPaidCents,
  currency,
  waveDate,
  waveTimeLabel,
  waveIsConfirmed,
  manageUrl,
}: BookingConfirmationEmailProps) {
  const firstName = leadName.trim().split(/\s+/)[0] || leadName;

  return (
    <EmailShell previewText="Your UTOPIA reservation is confirmed" manageUrl={manageUrl}>
      <Heading style={{ margin: "0 0 12px", fontFamily: displayFontStack, fontWeight: 500, fontSize: "20px", color: colors.ink }}>
        You're in, {firstName}.
      </Heading>
      <Text style={bodyText}>
        Your UTOPIA reservation is confirmed and paid in full — {partyTypeLabels[partyType]},{" "}
        {headcount} {headcount === 1 ? "player" : "players"}.
      </Text>

      <Hr style={{ borderColor: colors.rule, margin: "0 0 20px" }} />
      <Text style={{ ...bodyText, margin: "0 0 4px" }}>
        <strong>Amount paid</strong>
      </Text>
      <Text style={{ ...bigNumber, margin: "0 0 20px" }}>{formatMoney(amountPaidCents, currency)}</Text>
      <Hr style={{ borderColor: colors.rule, margin: "0 0 20px" }} />
      <Text style={{ ...bodyText, margin: "0 0 4px" }}>
        <strong>Wave</strong>
      </Text>
      <Text style={{ ...bigNumber, margin: "0 0 20px" }}>
        {waveIsConfirmed && waveDate ? `${formatWaveDate(waveDate)}, ${waveTimeLabel}` : "To be confirmed"}
      </Text>
      <Hr style={{ borderColor: colors.rule, margin: "0 0 20px" }} />

      {!waveIsConfirmed && <Text style={noticeBox}>{DATE_TBC_NOTICE}</Text>}
      <Text style={bodyText}>{RESCHEDULE_NOTICE}</Text>

      <EmailButton href={manageUrl}>Manage your booking</EmailButton>

      <Text style={bodyText}>
        See you on the trail. Come as a group, or come alone — we'll pair you up.
      </Text>
    </EmailShell>
  );
}

export default BookingConfirmationEmail;
