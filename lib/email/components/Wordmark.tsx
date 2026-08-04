// FILE: lib/email/components/Wordmark.tsx
// -----------------------------------------------------------------------------
// Text wordmark, not a hosted image — avoids depending on an image host that
// doesn't exist yet. "UTOPIA" in cobalt, matching the site header's .brand
// look — degrades to the same system-font fallback chain the site itself
// uses when Futura/Archivo aren't available, so it's still just styled
// text, safe in every client.
//
// Weight is 500 here, NOT the site's CSS "font-weight: 900" — the site's
// heading font (Futura Book) is a single self-hosted static font file, so
// its declared CSS weight is cosmetic and never actually changes how bold
// it renders. Archivo (this fallback) is a real multi-weight font, so
// reusing 900 here would render genuinely black/heavy — much bolder than
// Futura Book ever looks on the site. 500 is a closer visual match.
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
            fontWeight: 500,
            fontSize: "22px",
            letterSpacing: "-0.01em",
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
