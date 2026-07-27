// FILE: lib/email/components/Wordmark.tsx
// -----------------------------------------------------------------------------
// Text wordmark, not a hosted image — avoids depending on an image host that
// doesn't exist yet. "UTOPIA" in cobalt, all-caps, tight tracking; safe in
// every mail client since it's just styled text, not a custom font.
// -----------------------------------------------------------------------------

import { Link, Section, Text } from "@react-email/components";
import { colors, siteHomeUrl } from "./theme";

export function Wordmark() {
  return (
    <Section style={{ margin: "0 0 32px" }}>
      <Link href={siteHomeUrl} style={{ textDecoration: "none" }}>
        <Text
          style={{
            margin: 0,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontWeight: 700,
            fontSize: "22px",
            letterSpacing: "0.04em",
            color: colors.blue,
          }}
        >
          UTOPIA
        </Text>
      </Link>
    </Section>
  );
}

export default Wordmark;
