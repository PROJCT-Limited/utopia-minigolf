// FILE: lib/email/components/EmailFooter.tsx
// -----------------------------------------------------------------------------
// Quiet footer, identical across every FOUND email: what FOUND is, how to
// reach a person, the manage-booking link (where the template has one), and
// a sender identity line. Styled after FoundFooter (app/components/found/) —
// a full-width ink rule, then small wide-tracked uppercase mono meta.
// -----------------------------------------------------------------------------

import { Hr, Link, Section, Text } from "@react-email/components";
import { aboutLine, colors, companyAddress, archivoStack, monoStack } from "./theme";

export interface EmailFooterProps {
  manageUrl?: string;
}

const metaStyle = {
  margin: "0 0 10px",
  fontFamily: monoStack,
  fontSize: "11px",
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  lineHeight: "1.7",
  color: colors.grey,
};

const noteStyle = {
  margin: "0 0 10px",
  fontFamily: archivoStack,
  fontSize: "13px",
  lineHeight: "1.7",
  color: colors.grey,
};

export function EmailFooter({ manageUrl }: EmailFooterProps) {
  return (
    <Section style={{ marginTop: "44px" }}>
      <Hr style={{ borderColor: colors.ink, borderTopWidth: "1px", margin: "0 0 22px" }} />
      <Text style={noteStyle}>{aboutLine}</Text>
      <Text style={noteStyle}>Questions? Just reply to this email.</Text>
      {manageUrl ? (
        <Text style={noteStyle}>
          Manage your booking:{" "}
          <Link href={manageUrl} style={{ color: colors.ink }}>
            {manageUrl}
          </Link>
        </Text>
      ) : null}
      {companyAddress ? <Text style={{ ...metaStyle, margin: "18px 0 0" }}>{companyAddress}</Text> : null}
    </Section>
  );
}

export default EmailFooter;
