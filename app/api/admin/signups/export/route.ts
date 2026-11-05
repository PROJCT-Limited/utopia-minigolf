// FILE: app/api/admin/signups/export/route.ts
// -----------------------------------------------------------------------------
// GET /api/admin/signups/export?show=today — CSV download of the same list
// shown on /admin/signups, columns and all (both read SIGNUP_COLUMNS). Gated
// by proxy.ts's existing /api/admin/* auth check, same as every admin route.
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { todayInHongKong } from "@/lib/scoring/activeWindow";
import { SIGNUP_COLUMNS, fetchSignups, filterSignups, isSignupFilter } from "@/lib/admin/signups";

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET(req: NextRequest) {
  const show = req.nextUrl.searchParams.get("show") ?? undefined;
  const filter = isSignupFilter(show) ? show : "all";

  const rows = filterSignups(await fetchSignups(), filter);

  const lines = [
    SIGNUP_COLUMNS.map((col) => csvField(col.label)).join(","),
    ...rows.map((row) => SIGNUP_COLUMNS.map((col) => csvField((col.csv ?? col.display)(row))).join(",")),
  ];

  const filename = filter === "today" ? `found-signups-${todayInHongKong()}.csv` : "found-signups.csv";

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
