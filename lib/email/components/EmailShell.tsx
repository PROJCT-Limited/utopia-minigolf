// FILE: lib/email/components/EmailShell.tsx
// -----------------------------------------------------------------------------
// Shared page chrome: Html/Head/Preview/Body, a paper sheet capped at ~600px,
// the FOUND wordmark, and the footer. Templates just supply preview text +
// body. Square corners and flat paper throughout, matching .pageWrap in
// app/components/found/shared.module.css — FOUND has no card/radius chrome.
// -----------------------------------------------------------------------------

import type { ReactNode } from "react";
import { Body, Container, Head, Html, Preview } from "@react-email/components";
import { colors, archivoStack } from "./theme";
import { EmailLogo } from "./EmailLogo";
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
        {/* Archivo — the single face the FOUND system runs on (--f-archivo).
            Clients that don't support @import fall back to the system stack
            in theme.ts, same as the site itself. Input Mono isn't loaded
            here; see the note in theme.ts. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- this renders to a standalone email HTML string via Resend, not a Next.js page; the per-page-font-loading concern this rule guards against doesn't apply */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700&display=swap"
        />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: colors.canvas, margin: 0, padding: "40px 16px" }}>
        <Container
          style={{
            backgroundColor: colors.paper,
            maxWidth: "600px",
            margin: "0 auto",
            padding: "44px 44px 36px",
            fontFamily: archivoStack,
            color: colors.ink,
          }}
        >
          <EmailLogo />
          {children}
          <EmailFooter manageUrl={manageUrl} />
        </Container>
      </Body>
    </Html>
  );
}

export default EmailShell;
