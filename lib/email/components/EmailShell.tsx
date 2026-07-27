// FILE: lib/email/components/EmailShell.tsx
// -----------------------------------------------------------------------------
// Shared page chrome: Html/Head/Preview/Body, a card capped at ~600px, the
// wordmark, and the footer. Templates just supply preview text + body.
// -----------------------------------------------------------------------------

import type { ReactNode } from "react";
import { Body, Container, Head, Html, Preview } from "@react-email/components";
import { colors, fontStack } from "./theme";
import { Wordmark } from "./Wordmark";
import { EmailFooter } from "./EmailFooter";

export interface EmailShellProps {
  previewText: string;
  manageUrl?: string;
  children: ReactNode;
}

export function EmailShell({ previewText, manageUrl, children }: EmailShellProps) {
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: colors.bg, margin: 0, padding: "40px 16px" }}>
        <Container
          style={{
            backgroundColor: colors.panel,
            maxWidth: "600px",
            margin: "0 auto",
            padding: "36px 40px",
            borderRadius: "20px",
            fontFamily: fontStack,
          }}
        >
          <Wordmark />
          {children}
          <EmailFooter manageUrl={manageUrl} />
        </Container>
      </Body>
    </Html>
  );
}

export default EmailShell;
