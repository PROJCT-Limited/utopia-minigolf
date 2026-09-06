// FILE: app/api/admin/partners/export/route.ts
// -----------------------------------------------------------------------------
// GET /api/admin/partners/export?from=&to= — CSV download of the same report
// shown on /admin/partners, for paying partners offline. Gated by proxy.ts's
// existing /api/admin/* auth check, same as every other admin route.
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { fetchPartnerReport } from "@/lib/admin/partners";

const CSV_HEADER = ["Partner", "Ref code", "Clicks", "Bookings", "Players", "Sales (HKD)", "Rate (%)", "Commission owed (HKD)"];

function csvField(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from") ?? undefined;
  const to = req.nextUrl.searchParams.get("to") ?? undefined;

  const report = await fetchPartnerReport({ from, to });

  const lines = [
    CSV_HEADER.join(","),
    ...report.map((row) =>
      [
        csvField(row.name),
        csvField(row.refCode),
        csvField(row.clicks),
        csvField(row.bookings),
        csvField(row.players),
        csvField((row.salesCents / 100).toFixed(2)),
        csvField((row.commissionRate * 100).toFixed(1)),
        csvField((row.commissionOwedCents / 100).toFixed(2)),
      ].join(",")
    ),
  ];

  const filename = `found-partners-${from ?? "all"}_${to ?? "all"}.csv`;

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
