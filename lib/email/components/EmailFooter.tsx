// FILE: lib/email/components/EmailFooter.tsx
// -----------------------------------------------------------------------------
// Quiet footer, identical across every UTOPIA email: what UTOPIA is, how to
// reach a person, the manage-booking link (where the template has one), and
// a sender identity line.
// -----------------------------------------------------------------------------

import { Hr, Link, Section, Text } from "@react-email/components";
import { aboutLine, colors, companyAddress, bodyFontStack } from "./theme";

export interface EmailFooterProps {
  manageUrl?: string;
}

const footerTextStyle = {
  margin: "0 0 8px",
  fontFamily: bodyFontStack,
  fontSize: "12px",
  lineHeight: "1.6",
  color: colors.inkSoft,
};

export function EmailFooter({ manageUrl }: EmailFooterProps) {
  return (
    <Section style={{ marginTop: "32px" }}>
      <Hr style={{ borderColor: colors.rule, margin: "0 0 20px" }} />
      <Text style={footerTextStyle}>{aboutLine}</Text>
      <Text style={footerTextStyle}>Questions? Just reply to this email.</Text>
      {manageUrl ? (
        <Text style={footerTextStyle}>
          Manage your booking:{" "}
          <Link href={manageUrl} style={{ color: colors.inkSoft }}>
            {manageUrl}
          </Link>
        </Text>
      ) : null}
      {companyAddress ? <Text style={{ ...footerTextStyle, margin: 0 }}>{companyAddress}</Text> : null}
    </Section>
  );
}

export default EmailFooter;
