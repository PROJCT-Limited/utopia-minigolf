import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchWaveAdminDetail } from "@/lib/admin/waves";
import { TICKET_TYPE_LABELS } from "@/lib/booking/pricing";
import { AdminWaveForm } from "./AdminWaveForm";
import styles from "../../admin.module.css";

export const metadata = { title: "Manage slot — UTOPIA Admin" };
export const dynamic = "force-dynamic";

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-HK", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export default async function AdminWaveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await fetchWaveAdminDetail(id);
  if (!detail) notFound();

  const { wave, bookings, sessions } = detail;

  return (
    <main className={`wrap ${styles.page}`}>
      <div className={styles.headRow}>
        <div>
          <Link href="/admin" className="hint">
            ← All slots
          </Link>
          <h1 className={styles.title} style={{ marginTop: 8 }}>
            {wave.date}, {wave.startTime.slice(0, 5)}
          </h1>
        </div>
      </div>

      <div className={styles.card}>
        <h3 style={{ marginBottom: 14, fontSize: 15 }}>Edit slot</h3>
        <AdminWaveForm waveId={wave.id} wave={wave} />
      </div>

      <div className={styles.card}>
        <h3 style={{ marginBottom: 14, fontSize: 15 }}>Private bookings ({bookings.length})</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Lead</th>
              <th>Ticket</th>
              <th>Party</th>
              <th>Status</th>
              <th>Paid</th>
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
                <td>{TICKET_TYPE_LABELS[b.ticketType]}</td>
                <td>
                  {b.partyType}, {b.headcount}
                </td>
                <td>
                  <span className={styles.badge}>{b.status}</span>
                </td>
                <td>{formatMoney(b.amountPaidCents, b.currency)}</td>
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

      <div className={styles.card}>
        <h3 style={{ marginBottom: 14, fontSize: 15 }}>Public sessions ({sessions.length})</h3>
        {sessions.length === 0 && <p className="hint">No sessions yet.</p>}
        {sessions.map((s) => (
          <div key={s.id} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span className={styles.badge}>{s.status}</span>
              <span className="hint">{TICKET_TYPE_LABELS[s.ticketType]}</span>
              <span className="hint">
                {s.participants.filter((p) => p.status === "paid").length} of {s.maxPlayers} filled
              </span>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Paid</th>
                </tr>
              </thead>
              <tbody>
                {s.participants.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.name}
                      <br />
                      <span className="hint">{p.email}</span>
                    </td>
                    <td>{p.isHost ? "Host" : "Joiner"}</td>
                    <td>
                      <span className={styles.badge}>{p.status}</span>
                    </td>
                    <td>{formatMoney(p.amountPaidCents, p.currency)}</td>
                  </tr>
                ))}
                {s.participants.length === 0 && (
                  <tr>
                    <td colSpan={4}>No participants yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </main>
  );
}
