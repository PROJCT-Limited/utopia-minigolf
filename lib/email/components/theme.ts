// FILE: lib/email/components/theme.ts
// -----------------------------------------------------------------------------
// Email-safe translation of the site's design tokens (app/globals.css) — same
// cobalt blue as the site, hex values for wide email-client support.
// -----------------------------------------------------------------------------

export const colors = {
  bg: "#d7dbe2",
  panel: "#ffffff",
  ink: "#12151c",
  inkSoft: "#5a6069",
  rule: "rgba(18,21,28,.12)",
  blue: "#1b4dff",
  blueWash: "#e7ecff",
} as const;

export const fontStack =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export const siteHomeUrl = siteUrl;

export const aboutLine =
  "UTOPIA is a Minigolf Social Club by PROJCT, opening in Sai Ying Pun, Hong Kong.";

// CAN-SPAM-style sender identity line. Degrades gracefully with no address
// configured rather than fabricating one.
export const companyAddress = process.env.EMAIL_COMPANY_ADDRESS ?? null;
