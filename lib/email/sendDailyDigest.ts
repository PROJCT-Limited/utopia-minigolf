// FILE: lib/email/sendDailyDigest.ts
// -----------------------------------------------------------------------------
// Renders and sends the nightly internal digest.
//
// Deliberately not routed through sendEmailOnce(): that primitive keys
// idempotency on a booking id, and this email belongs to a day rather than a
// booking. The protection against duplicates is that one cron fires it; a
// second send is a duplicate of a report, not of a receipt, so it's cheap to
// get wrong and not worth a table to prevent.
// -----------------------------------------------------------------------------

import { render } from "@react-email/components";
import { resend } from "./resendClient";
import { DailyDigestEmail, digestHeadline, formatDigestDay } from "./DailyDigest";
import { digestDayFor, type DigestStats } from "@/lib/stats/dailyDigest";
import { fetchDailyDigest } from "@/lib/stats/dailyDigestRepo";

export type SendDailyDigestResult =
  | { ok: true; day: string; recipients: string[]; stats: DigestStats }
  | { ok: false; error: string };

/**
 * Who gets it. A comma-separated DAILY_DIGEST_TO, so the list can change
 * without a deploy. No fallback recipient on purpose — quietly mailing an
 * internal report to whatever address happens to be configured elsewhere is
 * worse than not sending it.
 */
export function digestRecipients(): string[] {
  return (process.env.DAILY_DIGEST_TO ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

/** The digest as HTML, without sending it — behind the route's own auth. */
export async function renderDailyDigest(day: string = digestDayFor()): Promise<string> {
  const stats = await fetchDailyDigest(day);
  const adminUrl = `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/admin`;
  return render(DailyDigestEmail({ stats, adminUrl }));
}

export async function sendDailyDigest({
  day = digestDayFor(),
  to,
}: { day?: string; to?: string[] } = {}): Promise<SendDailyDigestResult> {
  const recipients = to?.length ? to : digestRecipients();
  if (recipients.length === 0) {
    return { ok: false, error: "No recipients — set DAILY_DIGEST_TO." };
  }

  const from = process.env.EMAIL_FROM;
  if (!from) return { ok: false, error: "EMAIL_FROM is not set." };

  const stats = await fetchDailyDigest(day);
  const adminUrl = `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/admin`;

  const html = await render(DailyDigestEmail({ stats, adminUrl }));

  const { error } = await resend.emails.send({
    from,
    to: recipients,
    subject: `FOUND · ${digestHeadline(stats)} — ${formatDigestDay(stats.day)}`,
    html,
  });

  if (error) {
    console.error("sendDailyDigest: Resend rejected the send:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, day: stats.day, recipients, stats };
}
