// FILE: lib/email/components/EmailButton.tsx
// -----------------------------------------------------------------------------
// The one primary action a transactional email gets — cobalt, rounded, built
// on react-email's <Button>, which renders the MSO padding hack Outlook needs.
// -----------------------------------------------------------------------------

import { Button, Section } from "@react-email/components";
import { colors, bodyFontStack } from "./theme";

export interface EmailButtonProps {
  href: string;
  children: string;
}

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Section style={{ margin: "24px 0" }}>
      <Button
        href={href}
        style={{
          backgroundColor: colors.blue,
          color: "#ffffff",
          border: `1px solid ${colors.blue}`,
          borderRadius: "100px",
          fontFamily: bodyFontStack,
          fontSize: "14px",
          fontWeight: 700,
          textDecoration: "none",
          textAlign: "center",
          display: "block",
          padding: "16px 28px",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

export default EmailButton;
