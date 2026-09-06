import Link from "next/link";
import { fetchPartnerReport } from "@/lib/admin/partners";
import { CreatePartnerForm } from "./CreatePartnerForm";
import { CopyRefLink } from "./CopyRefLink";
import styles from "../admin.module.css";

function refLinkFor(refCode: string): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/book?ref=${refCode}`;
}

export const metadata = { title: "Partners — FOUND Admin" };
export const dynamic = "force-dynamic";

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-HK", { style: "currency", currency: "HKD" }).format(cents / 100);
}

function firstOfThisMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const from = params.from || firstOfThisMonth();
  const to = params.to || today();

  const report = await fetchPartnerReport({ from, to });
  const exportHref = `/api/admin/partners/export?from=${from}&to=${to}`;

  return (
    <main className={`wrap ${styles.page}`}>
      <div className={styles.headRow}>
        <div>
          <span className="lbl">FOUND Admin</span>
          <h1 className={styles.title}>Partners</h1>
        </div>
        <Link href="/admin" className="hint">
          ← Slots
        </Link>
      </div>

      <div className={styles.card}>
        <h3 style={{ marginBottom: 14, fontSize: 15 }}>Add a partner</h3>
        <CreatePartnerForm />
      </div>

      <div className={styles.card}>
        <form method="get" className={styles.formGrid} style={{ marginBottom: 20 }}>
          <div className={styles.field}>
            <label htmlFor="from">From</label>
            <input id="from" name="from" type="date" defaultValue={from} />
          </div>
          <div className={styles.field}>
            <label htmlFor="to">To</label>
            <input id="to" name="to" type="date" defaultValue={to} />
          </div>
          <button type="submit" className="btn btn-outline">
            Filter
          </button>
          <a href={exportHref} className="btn btn-outline">
            Export CSV
          </a>
        </form>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Partner</th>
              <th>Link</th>
              <th>Clicks</th>
              <th>Bookings</th>
              <th>Players</th>
              <th>Sales</th>
              <th>Rate</th>
              <th>Commission owed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {report.map((row) => (
              <tr key={row.refCode}>
                <td>
                  {row.name}
                  {!row.active && (
                    <>
                      <br />
                      <span className={styles.badge}>inactive</span>
                    </>
                  )}
                </td>
                <td>
                  <CopyRefLink url={refLinkFor(row.refCode)} />
                </td>
                <td>{row.clicks}</td>
                <td>{row.bookings}</td>
                <td>{row.players}</td>
                <td>{formatMoney(row.salesCents)}</td>
                <td>{(row.commissionRate * 100).toFixed(1)}%</td>
                <td>{formatMoney(row.commissionOwedCents)}</td>
                <td>
                  <Link href={`/admin/partners/${row.refCode}`}>Edit →</Link>
                </td>
              </tr>
            ))}
            {report.length === 0 && (
              <tr>
                <td colSpan={9}>No partners yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
