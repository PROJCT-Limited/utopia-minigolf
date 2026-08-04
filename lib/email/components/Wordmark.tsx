// FILE: lib/email/components/Wordmark.tsx
// -----------------------------------------------------------------------------
// Text wordmark, not a hosted image — avoids depending on an image host that
// doesn't exist yet. "UTOPIA" in cobalt, matching the site header's .brand
// style (displayFontStack, weight 900, tight tracking) — degrades to the
// same system-font fallback chain the site itself uses when Futura/Archivo
// aren't available, so it's still just styled text, safe in every client.
// -----------------------------------------------------------------------------

import { Link, Section, Text } from "@react-email/components";
import { colors, displayFontStack, siteHomeUrl } from "./theme";

export function Wordmark() {
  return (
    <Section style={{ margin: "0 0 32px" }}>
      <Link href={siteHomeUrl} style={{ textDecoration: "none" }}>
        <Text
          style={{
            margin: 0,
            fontFamily: displayFontStack,
            fontWeight: 900,
            fontSize: "22px",
            letterSpacing: "-0.02em",
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
