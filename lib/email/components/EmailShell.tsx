// FILE: lib/email/components/EmailShell.tsx
// -----------------------------------------------------------------------------
// Shared page chrome: Html/Head/Preview/Body, a card capped at ~600px, the
// wordmark, and the footer. Templates just supply preview text + body.
// -----------------------------------------------------------------------------

import type { ReactNode } from "react";
import { Body, Container, Head, Html, Preview } from "@react-email/components";
import { colors, bodyFontStack } from "./theme";
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
        {/* Same two families the site uses (Manrope for body, Archivo for
            display/headings) — clients that don't support @import just fall
            back to the system stacks in theme.ts, same as the site itself. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- this renders to a standalone email HTML string via Resend, not a Next.js page; the per-page-font-loading concern this rule guards against doesn't apply */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Archivo:wght@500&display=swap"
        />
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
            fontFamily: bodyFontStack,
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
