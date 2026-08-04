// FILE: lib/email/SessionParticipantJoined.tsx
// -----------------------------------------------------------------------------
// React Email template sent the moment a session joiner's (non-host) own
// payment succeeds. Confirms their own place and how many others are in.
// Rendered to HTML by lib/email/send.ts and sent via Resend.
// -----------------------------------------------------------------------------

import { Heading, Hr, Text } from "@react-email/components";
import { formatMoney } from "./format";
import { EmailShell } from "./components/EmailShell";
import { colors, bodyFontStack, displayFontStack } from "./components/theme";
import { DATE_TBC_NOTICE } from "@/lib/booking/copy";
import { formatWaveDate } from "@/app/utils/formatWave";

export interface SessionParticipantJoinedEmailProps {
  participantName: string;
  amountPaidCents: number;
  currency: string;
  paidCount: number;
  maxPlayers: number;
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
  fontWeight: 800,
  color: colors.ink,
};

export function SessionParticipantJoinedEmail({
  participantName,
  amountPaidCents,
  currency,
  paidCount,
  maxPlayers,
  waveDate,
  waveTimeLabel,
  waveIsConfirmed,
  manageUrl,
}: SessionParticipantJoinedEmailProps) {
  const firstName = participantName.trim().split(/\s+/)[0] || participantName;

  return (
    <EmailShell previewText="You're in — your UTOPIA session place is confirmed" manageUrl={manageUrl}>
      <Heading style={{ margin: "0 0 12px", fontFamily: displayFontStack, fontSize: "20px", color: colors.ink }}>
        You&rsquo;re in, {firstName}.
      </Heading>
      <Text style={bodyText}>
        Your place in this UTOPIA session is confirmed and paid in full — {paidCount} of {maxPlayers} spots filled
        so far.
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

      <Text style={bodyText}>See you on the trail.</Text>
    </EmailShell>
  );
}

export default SessionParticipantJoinedEmail;
