// FILE: lib/email/components/EmailLogo.tsx
// -----------------------------------------------------------------------------
// The FOUND wordmark, as a hosted PNG rather than the site's SVG — Gmail,
// Outlook and Yahoo all strip <img src="*.svg">, so public/found/
// logo-found-email.png is a raster of the same artwork, recolored from the
// source's near-white (#F7F7F7, for the hero's white-on-image treatment) to
// --f-ink, since email renders it on paper. Shipped at 2x (360px) for the
// 180px display width.
// -----------------------------------------------------------------------------

import { Img, Link, Section } from "@react-email/components";
import { logoUrl, siteHomeUrl } from "./theme";

export function EmailLogo() {
  return (
    <Section style={{ margin: "0 0 40px" }}>
      <Link href={siteHomeUrl}>
        <Img src={logoUrl} alt="FOUND" width="180" height="36" style={{ display: "block", border: 0 }} />
      </Link>
    </Section>
  );
}

export default EmailLogo;
