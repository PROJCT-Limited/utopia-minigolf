// FILE: lib/email/components/EmailButton.tsx
// -----------------------------------------------------------------------------
// The one primary action a transactional email gets — the FOUND pill button
// (.pillBtn in app/components/found/shared.module.css): ink fill, paper-white
// label, fully rounded, Archivo 700/14. Built on react-email's <Button>,
// which renders the MSO padding hack Outlook needs.
// -----------------------------------------------------------------------------

import { Button, Section } from "@react-email/components";
import { colors, archivoStack } from "./theme";

export interface EmailButtonProps {
  href: string;
  children: string;
}

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Section style={{ margin: "28px 0" }}>
      <Button
        href={href}
        style={{
          backgroundColor: colors.ink,
          color: colors.white,
          border: `1px solid ${colors.ink}`,
          borderRadius: "100px",
          fontFamily: archivoStack,
          fontSize: "14px",
          fontWeight: 700,
          textDecoration: "none",
          textAlign: "center",
          display: "block",
          padding: "16px 26px",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

export default EmailButton;
