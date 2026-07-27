import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchWaveAdminDetail } from "@/lib/admin/waves";
import { AdminWaveForm } from "./AdminWaveForm";
import styles from "../../admin.module.css";

export const metadata = { title: "Manage wave — UTOPIA Admin" };
export const dynamic = "force-dynamic";

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-HK", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export default async function AdminWaveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await fetchWaveAdminDetail(id);
  if (!detail) notFound();

  const { wave, bookings } = detail;

  return (
    <main className={`wrap ${styles.page}`}>
      <div className={styles.headRow}>
        <div>
          <Link href="/admin" className="hint">
            ← All waves
          </Link>
          <h1 className={styles.title} style={{ marginTop: 8 }}>
            {wave.date} · {wave.startTime.slice(0, 5)}
          </h1>
        </div>
      </div>

      <div className={styles.card}>
        <h3 style={{ marginBottom: 14, fontSize: 15 }}>Edit wave</h3>
        <AdminWaveForm waveId={wave.id} wave={wave} />
      </div>

      <div className={styles.card}>
        <h3 style={{ marginBottom: 14, fontSize: 15 }}>Bookings ({bookings.length})</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Lead</th>
              <th>Party</th>
              <th>Status</th>
              <th>Paid</th>
              <th>Pairing</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>
                  {b.leadName}
                  <br />
                  <span className="hint">{b.leadEmail}</span>
                </td>
                <td>
                  {b.partyType} · {b.headcount}
                </td>
                <td>
                  <span className={styles.badge}>{b.status}</span>
                </td>
                <td>{formatMoney(b.amountPaidCents, b.currency)}</td>
                <td>
                  {b.pairOptIn && b.pairing ? (
                    <div className={styles.pairingNote}>
                      {b.pairing.ageBand && <div>{b.pairing.ageBand}</div>}
                      {b.pairing.interests.length > 0 && <div>{b.pairing.interests.join(", ")}</div>}
                      {b.pairing.bio && <div>&ldquo;{b.pairing.bio}&rdquo;</div>}
                    </div>
                  ) : (
                    <span className="hint">—</span>
                  )}
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={5}>No bookings yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
