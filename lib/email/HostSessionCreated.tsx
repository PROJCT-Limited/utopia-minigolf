// FILE: lib/email/HostSessionCreated.tsx
// -----------------------------------------------------------------------------
// React Email template sent the moment a session host's own payment succeeds.
// Leads with the share link — the durable copy of what's also shown on the
// session page right after payment — and explains the public-session rules.
// Rendered to HTML by lib/email/send.ts and sent via Resend.
// -----------------------------------------------------------------------------

import { Heading, Hr, Text } from "@react-email/components";
import { formatMoney } from "./format";
import { EmailShell } from "./components/EmailShell";
import { EmailButton } from "./components/EmailButton";
import { colors, fontStack } from "./components/theme";
import { DATE_TBC_NOTICE, PUBLIC_SESSION_EXPLAINER } from "@/lib/booking/copy";

export interface HostSessionCreatedEmailProps {
  hostName: string;
  amountPaidCents: number;
  currency: string;
  shareUrl: string;
  manageUrl: string;
}

const bodyText = {
  margin: "0 0 16px",
  fontFamily: fontStack,
  fontSize: "15px",
  lineHeight: "1.6",
  color: colors.ink,
};

const noticeBox = {
  margin: "0 0 20px",
  padding: "16px 18px",
  borderRadius: "14px",
  backgroundColor: colors.blueWash,
  fontFamily: fontStack,
  fontSize: "14px",
  lineHeight: "1.55",
  color: colors.ink,
};

export function HostSessionCreatedEmail({
  hostName,
  amountPaidCents,
  currency,
  shareUrl,
  manageUrl,
}: HostSessionCreatedEmailProps) {
  const firstName = hostName.trim().split(/\s+/)[0] || hostName;

  return (
    <EmailShell previewText="Your UTOPIA session is live — share your link" manageUrl={manageUrl}>
      <Heading style={{ margin: "0 0 12px", fontFamily: fontStack, fontSize: "20px", color: colors.ink }}>
        You&rsquo;re in, {firstName} — now share your link.
      </Heading>
      <Text style={bodyText}>
        Your place is paid and your session is live. Send the link below to anyone you want along — each person
        pays for their own place when they join.
      </Text>

      <EmailButton href={shareUrl}>Open your session</EmailButton>

      <Hr style={{ borderColor: colors.rule, margin: "0 0 20px" }} />
      <Text style={{ ...bodyText, margin: "0 0 4px" }}>
        <strong>Amount paid</strong>
      </Text>
      <Text style={{ ...bodyText, margin: "0 0 20px", fontSize: "20px", fontWeight: 700 }}>
        {formatMoney(amountPaidCents, currency)}
      </Text>
      <Hr style={{ borderColor: colors.rule, margin: "0 0 20px" }} />

      <Text style={noticeBox}>{PUBLIC_SESSION_EXPLAINER}</Text>
      <Text style={noticeBox}>{DATE_TBC_NOTICE}</Text>

      <Text style={bodyText}>See you on the trail.</Text>
    </EmailShell>
  );
}

export default HostSessionCreatedEmail;
