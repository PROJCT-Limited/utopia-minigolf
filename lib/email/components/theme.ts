// FILE: lib/email/components/theme.ts
// -----------------------------------------------------------------------------
// Email-safe translation of the FOUND design system (the --f-* tokens in
// app/globals.css, which every page now renders in). Hex values throughout
// for wide email-client support; no CSS variables, since Outlook and several
// webmail clients strip custom properties.
// -----------------------------------------------------------------------------

export const colors = {
  // --f-paper, one step deeper, so the sheet reads as a sheet against the
  // client's own chrome. Not a FOUND token — derived from --f-paper only for
  // the outer email canvas, which the site has no equivalent of.
  canvas: "#e5e4df",
  paper: "#f2f1ed", // --f-paper
  ink: "#131210", // --f-ink
  white: "#f7f7f7", // --f-white
  grey: "#75736b", // --f-grey
  stone: "#a19d94", // --f-stone
  // FOUND draws hairlines as --f-ink at low alpha (see .detailRow in
  // app/components/found/shared.module.css).
  rule: "rgba(19,18,16,.12)",
  ruleStrong: "rgba(19,18,16,.25)",
} as const;

// FOUND runs on two faces: Archivo for everything, Input Mono for the small
// uppercase labels. Archivo is loaded from Google Fonts in EmailShell's
// <Head> for clients that support it (Apple Mail, Gmail web, Outlook.com);
// everywhere else this stack falls back to the same system fonts the site
// falls back to.
//
// Input Mono is deliberately NOT loaded here: it's a self-hosted licensed
// face (app/fonts/InputMono-Regular.ttf), not licensed for embedding in
// outbound email, and Google Fonts doesn't carry it. Mono labels therefore
// render in the recipient's system monospace — which keeps the label's
// *role* (small, wide-tracked, uppercase) intact even though the face
// differs. Same tradeoff the previous theme made for Futura Book.
export const archivoStack =
  '"Archivo", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

export const monoStack =
  '"Input Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Courier New", monospace';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export const siteHomeUrl = siteUrl;

// Absolute base for images referenced from email HTML. Split from
// siteHomeUrl so a test send can point the logo at a preview deployment
// without rewriting every link in the email.
export const assetBaseUrl = process.env.EMAIL_ASSET_BASE_URL ?? siteUrl;

export const logoUrl = `${assetBaseUrl}/found/logo-found-email.png`;

export const aboutLine =
  "FOUND is a Minigolf Social Club by PROJCT, opening in Sai Ying Pun, Hong Kong.";

// CAN-SPAM-style sender identity line. Degrades gracefully with no address
// configured rather than fabricating one.
export const companyAddress = process.env.EMAIL_COMPANY_ADDRESS ?? null;
