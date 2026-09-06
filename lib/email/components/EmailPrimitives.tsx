// FILE: lib/email/components/EmailPrimitives.tsx
// -----------------------------------------------------------------------------
// The FOUND type roles and the bordered detail box, as email components —
// direct counterparts to .h48 / .body15 / .monoLabel / .detailBox /
// .detailRow in app/components/found/shared.module.css, so a guest sees the
// same summary block in their inbox that they saw on the confirmation page.
//
// The detail box is built from <Row>/<Column> (tables) rather than the site's
// flexbox, since Outlook's Word rendering engine ignores flex entirely.
// -----------------------------------------------------------------------------

import type { ReactNode } from "react";
import { Column, Heading, Row, Section, Text } from "@react-email/components";
import { archivoStack, colors, monoStack } from "./theme";

export function EmailHeading({ children }: { children: ReactNode }) {
  return (
    <Heading
      style={{
        margin: "0 0 16px",
        fontFamily: archivoStack,
        fontWeight: 500,
        fontSize: "32px",
        lineHeight: "1.05",
        letterSpacing: "-0.03em",
        color: colors.ink,
      }}
    >
      {children}
    </Heading>
  );
}

export const bodyText = {
  margin: "0 0 16px",
  fontFamily: archivoStack,
  fontWeight: 400,
  fontSize: "15px",
  lineHeight: "1.7",
  color: colors.grey,
};

// Same wide-tracked uppercase mono as .monoLabel — used above the detail box
// as a section eyebrow.
export function MonoLabel({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 12px",
        fontFamily: monoStack,
        fontSize: "11px",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: colors.grey,
      }}
    >
      {children}
    </Text>
  );
}

// FOUND has no tinted callout (no blue wash any more) — a notice is set off
// by a hairline rule box on paper instead.
export function EmailNotice({ children }: { children: ReactNode }) {
  return (
    <Section
      style={{
        margin: "0 0 20px",
        padding: "18px 20px",
        border: `1px solid ${colors.ruleStrong}`,
      }}
    >
      <Text
        style={{
          margin: 0,
          fontFamily: archivoStack,
          fontSize: "14px",
          lineHeight: "1.65",
          color: colors.grey,
        }}
      >
        {children}
      </Text>
    </Section>
  );
}

export interface DetailRow {
  label: string;
  value: string;
}

/**
 * The bordered summary block. `rows` render as mono-label-left /
 * value-right pairs; the last row is drawn without its hairline, matching
 * .detailRow:last-child.
 */
export function EmailDetailBox({ rows }: { rows: DetailRow[] }) {
  return (
    <Section
      style={{
        margin: "0 0 28px",
        border: `1px solid ${colors.ink}`,
        padding: "26px 28px",
      }}
    >
      {rows.map(({ label, value }, index) => {
        const isLast = index === rows.length - 1;
        const cell = {
          padding: `${index === 0 ? "0" : "14px"} 0 ${isLast ? "0" : "14px"}`,
          borderBottom: isLast ? "none" : `1px solid ${colors.rule}`,
        };
        return (
          <Row key={label}>
            <Column style={{ ...cell, verticalAlign: "bottom" }}>
              <Text
                style={{
                  margin: 0,
                  fontFamily: monoStack,
                  fontSize: "11px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: colors.grey,
                }}
              >
                {label}
              </Text>
            </Column>
            <Column style={{ ...cell, verticalAlign: "bottom", textAlign: "right" }}>
              <Text
                style={{
                  margin: 0,
                  fontFamily: archivoStack,
                  fontWeight: 500,
                  fontSize: "15px",
                  color: colors.ink,
                  textAlign: "right",
                }}
              >
                {value}
              </Text>
            </Column>
          </Row>
        );
      })}
    </Section>
  );
}
