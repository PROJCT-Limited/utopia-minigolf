// FILE: app/api/cron/daily-digest/route.ts
// -----------------------------------------------------------------------------
// GET /api/cron/daily-digest — sends the internal daily stats email.
//
// Fired by the Vercel cron entry in vercel.json at 16:00 UTC, which is
// midnight in Hong Kong: the digest then covers the HK day that has just
// finished (see digestDayFor). `?day=YYYY-MM-DD` reports a different day, for
// a backfill or a test, and `?preview=1` renders it without sending.
//
// It also does the one piece of nightly housekeeping: closing abandoned
// checkouts that the same guest has since paid past.
//
// This route sits outside proxy.ts's staff prefixes (/admin, /api/admin,
// /checkin) because a cron request carries no session cookie, so it carries
// its own auth instead: a bearer token Vercel attaches from CRON_SECRET.
// Without that env var set the route refuses to run at all rather than
// defaulting open — an open endpoint here would let anyone on the internet
// mail the team's sales figures on demand.
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { renderDailyDigest, sendDailyDigest } from "@/lib/email/sendDailyDigest";
import { sweepSupersededPendings } from "@/lib/booking/supersededPendingsRepo";

export const dynamic = "force-dynamic";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("daily-digest: CRON_SECRET is not set — refusing to run.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const dayParam = req.nextUrl.searchParams.get("day");
  const day = dayParam && DAY_RE.test(dayParam) ? dayParam : undefined;

  // ?preview=1 renders the email and sends nothing — for checking what
  // tonight's will look like, or what a given day's did. Behind the same
  // bearer token as the send itself, since it carries the same figures.
  if (req.nextUrl.searchParams.get("preview")) {
    const html = await renderDailyDigest(day);
    return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  // Housekeeping before the figures are taken, so the digest counts what's
  // actually outstanding: checkouts a later payment has already answered are
  // closed first (see lib/booking/supersededPendings.ts).
  const swept = await sweepSupersededPendings();
  if (swept.cancelled > 0) {
    console.log(`daily-digest: closed ${swept.cancelled} superseded pending booking(s)`);
  }

  const result = await sendDailyDigest({ day });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    sent: true,
    day: result.day,
    pendingsClosed: swept.cancelled,
    recipients: result.recipients.length,
    people: result.stats.today.people,
    groups: result.stats.today.groups,
  });
}
